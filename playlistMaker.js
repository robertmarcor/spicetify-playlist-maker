// Playlist Maker: paste a song list (plain lines or a markdown checklist), get a Spotify playlist.
(async function playlistMaker() {
  if (!Spicetify?.Platform?.RootlistAPI || !Spicetify.Platform.GraphQLLoader || !Spicetify.GraphQL?.Definitions || !Spicetify.Topbar) {
    setTimeout(playlistMaker, 300);
    return;
  }
  const { RootlistAPI, PlaylistAPI, GraphQLLoader } = Spicetify.Platform;

  // Markdown lists: keep only "- [ ] song" / "- song" lines so headings and notes are ignored.
  function parseSongs(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = lines.filter((l) => /^([-*+]|\d+\.)\s/.test(l));
    return (items.length ? items : lines).map((l) => l.replace(/^([-*+]|\d+\.)\s+(\[.\]\s+)?/, "").trim()).filter(Boolean);
  }

  const nSongs = (n) => `${n} song${n === 1 ? "" : "s"}`;

  // showNotification is missing in newer clients; the log in the modal already shows the result.
  const notify = (msg, isError) => {
    try {
      Spicetify.showNotification?.(msg, isError) ?? Spicetify.Snackbar?.enqueueSnackbar?.(msg, { variant: isError ? "error" : "default" });
    } catch {}
  };

  const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  // Spotify's own search (CosmosAsync is gone in newer clients). Picks the track whose
  // title + artists share the most words with the query, so "A x B" mashups beat plain "A".
  async function findTrack(query) {
    const res = await GraphQLLoader(Spicetify.GraphQL.Definitions.searchModalResults, {
      searchTerm: query, offset: 0, limit: 10, numberOfTopResults: 10,
      includeAudiobooks: false, includePreReleases: false, includeAuthors: false,
      includeLocalConcertsField: false, includeArtistHasConcertsField: false,
    });
    const tracks = (res?.data?.searchV2?.topResultsV2?.itemsV2 ?? [])
      .map((i) => i.item?.data)
      .filter((d) => d?.__typename === "Track");
    const q = words(query);
    let best = null, bestScore = -1;
    for (const t of tracks) {
      const have = new Set(words(`${t.name} ${t.artists.items.map((a) => a.profile.name).join(" ")}`));
      const score = q.filter((w) => have.has(w)).length;
      if (score > bestScore) [best, bestScore] = [t, score];
    }
    return best ? { uri: best.uri, label: `${best.name} — ${best.artists.items.map((a) => a.profile.name).join(", ")}` } : null;
  }

  // Playlists you can add to, folders flattened.
  async function editablePlaylists() {
    const out = [];
    const walk = (items, prefix) => {
      for (const it of items ?? []) {
        if (it.type === "folder") walk(it.items, `${prefix}${it.name} / `);
        else if (it.type === "playlist" && it.canAdd) out.push({ uri: it.uri, name: prefix + it.name, count: it.totalLength ?? 0 });
      }
    };
    walk((await RootlistAPI.getContents()).items, "");
    return out;
  }

  const ROW = 36; // px per song row; the textarea's divider lines are drawn at this pitch
  const field = "padding:8px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;font:inherit";

  // Own modal instead of Spicetify.PopupModal: its hide() crashes on newer clients (no
  // ReactDOM.unmountComponentAtNode), and it closed when a text selection was released outside.
  function openModal() {
    // Inline styles: Spotify's CSS class names are hashed, so borrowed class names style nothing.
    const overlay = document.createElement("div");
    overlay.className = "pm-overlay";
    overlay.style.cssText = "position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center";
    overlay.innerHTML = `
      <div class="pm-dialog" role="dialog" aria-modal="true" aria-label="Playlist Maker" tabindex="-1"
        style="width:min(640px,92vw);max-height:90vh;overflow:auto;background:#282828;color:#fff;border-radius:8px;box-shadow:0 16px 24px rgba(0,0,0,.5);outline:none">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:24px 24px 12px">
            <h1 style="margin:0;font-size:24px;font-weight:700">Playlist Maker</h1>
            <button aria-label="Close" id="pm-close" style="background:none;border:0;color:#fff;cursor:pointer;padding:4px">
              <svg width="18" height="18" viewBox="0 0 32 32"><path d="M31.098 29.794L16.955 15.65 31.097 1.51 29.683.093 15.54 14.237 1.4.094-.016 1.508 14.126 15.65-.016 29.795l1.414 1.414L15.54 17.065l14.144 14.143" fill="currentColor"/></svg>
            </button>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;padding:0 24px 24px">
            <label style="display:flex;flex-direction:column;gap:4px">Add to
              <select id="pm-target" style="${field}"><option value="">➕ New playlist</option></select>
            </label>
            <input id="pm-name" placeholder="New playlist name" value="New Playlist" style="${field}">
            <textarea id="pm-songs" wrap="off" spellcheck="false"
              placeholder="One song per line (artist + title works best). Markdown checklists are fine."
              style="${field};height:${ROW * 8}px;resize:vertical;padding:0 12px;line-height:${ROW}px;
                background:repeating-linear-gradient(#222 0 ${ROW - 1}px,#444 ${ROW - 1}px ${ROW}px) local;"></textarea>
            <div id="pm-count" style="font-size:12px;opacity:.7;margin-top:-6px">0 songs</div>
            <button id="pm-go" style="padding:10px;border-radius:500px;border:0;background:#1ed760;color:#000;font-weight:700;cursor:pointer">Create playlist</button>
            <div id="pm-log" style="max-height:240px;overflow:auto;font-size:13px;white-space:pre-wrap"></div>
          </div>
        </div>
      </div>`;
    const $ = (id) => overlay.querySelector(id);
    const dialog = $(".pm-dialog");

    const close = () => {
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey, true);
    $("#pm-close").onclick = close;
    // Close only when the press AND the release both happen outside the dialog.
    let downOutside = false;
    overlay.addEventListener("mousedown", (e) => (downOutside = !dialog.contains(e.target)));
    overlay.addEventListener("click", (e) => downOutside && !dialog.contains(e.target) && close());

    const target = $("#pm-target"), name = $("#pm-name"), songsBox = $("#pm-songs"), go = $("#pm-go"), log = $("#pm-log");
    const syncTarget = () => {
      name.style.display = target.value ? "none" : "";
      go.textContent = target.value ? "Add to playlist" : "Create playlist";
    };
    target.onchange = syncTarget;
    songsBox.oninput = () => ($("#pm-count").textContent = nSongs(parseSongs(songsBox.value).length));

    editablePlaylists().then((lists) => {
      for (const p of lists) target.add(new Option(`${p.name} (${nSongs(p.count)})`, p.uri));
    }).catch((e) => (log.textContent = `Could not load your playlists: ${e?.message || e}`));

    go.onclick = async () => {
      const songs = parseSongs(songsBox.value);
      if (!songs.length) return notify("Paste at least one song", true);

      go.disabled = true;
      log.textContent = "";
      try {
        // Skip songs already in the chosen playlist, and repeats within the list.
        const existing = new Set();
        if (target.value) {
          const c = await PlaylistAPI.getContents(target.value, { limit: 10000 });
          c.items.forEach((i) => existing.add(i.uri));
        }
        const uris = [];
        let missing = 0, skipped = 0;
        for (const [i, song] of songs.entries()) {
          go.textContent = `Searching ${i + 1}/${songs.length}…`;
          try {
            const hit = await findTrack(song);
            if (!hit) {
              missing++;
              log.textContent += `✗ ${song}  (no match)\n`;
            } else if (existing.has(hit.uri)) {
              skipped++;
              log.textContent += `• ${song}  →  ${hit.label}  (already in playlist)\n`;
            } else {
              existing.add(hit.uri);
              uris.push(hit.uri);
              log.textContent += `✓ ${song}  →  ${hit.label}\n`;
            }
          } catch (e) {
            missing++;
            log.textContent += `✗ ${song}  (search failed: ${e?.message || e})\n`;
          }
        }

        if (!uris.length) throw new Error(skipped ? "every match is already in the playlist" : "no songs matched");
        const listName = target.value ? target.selectedOptions[0].text.replace(/ \(\d+ songs?\)$/, "") : name.value.trim() || "New Playlist";
        const playlistUri = target.value || (await RootlistAPI.createPlaylist(listName, { before: "start" }));
        await PlaylistAPI.add(playlistUri, uris, { before: "end" });
        const summary = `${target.value ? "Added" : "Created"} "${listName}": ${uris.length} added` +
          (skipped ? `, ${skipped} already there` : "") + (missing ? `, ${missing} not found` : "") + ".";
        log.textContent += `\n${summary}`;
        notify(summary);
      } catch (e) {
        log.textContent += `\nNothing added: ${e?.message || e}`;
        notify("Playlist Maker: nothing added", true);
      } finally {
        go.disabled = false;
        syncTarget();
      }
    };

    document.body.append(overlay);
    dialog.focus();
  }

  new Spicetify.Topbar.Button("Playlist Maker", "playlist", openModal);
})();
