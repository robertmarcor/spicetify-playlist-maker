// Playlist Maker: paste a song list (plain lines or a markdown checklist), get a Spotify playlist.
(async function playlistMaker() {
  if (!Spicetify?.Platform?.RootlistAPI || !Spicetify.Platform.GraphQLLoader || !Spicetify.GraphQL?.Definitions || !Spicetify.Topbar || !Spicetify.PopupModal) {
    setTimeout(playlistMaker, 300);
    return;
  }

  // Markdown lists: keep only "- [ ] song" / "- song" lines so headings and notes are ignored.
  function parseSongs(text) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = lines.filter((l) => /^([-*+]|\d+\.)\s/.test(l));
    return (items.length ? items : lines).map((l) => l.replace(/^([-*+]|\d+\.)\s+(\[.\]\s+)?/, "").trim()).filter(Boolean);
  }

  const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

  // Spotify's own search (CosmosAsync is gone in newer clients). Picks the track whose
  // title + artists share the most words with the query, so "A x B" mashups beat plain "A".
  async function findTrack(query) {
    const res = await Spicetify.Platform.GraphQLLoader(Spicetify.GraphQL.Definitions.searchModalResults, {
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

  function openModal() {
    const root = document.createElement("div");
    root.style.cssText = "display:flex;flex-direction:column;gap:10px";
    root.innerHTML = `
      <input id="pm-name" placeholder="Playlist name" value="New Playlist"
        style="padding:8px;border-radius:4px;border:1px solid #555;background:#222;color:#fff">
      <textarea id="pm-songs" rows="12" placeholder="One song per line (artist + title works best). Markdown checklists are fine."
        style="padding:8px;border-radius:4px;border:1px solid #555;background:#222;color:#fff;font-family:inherit"></textarea>
      <button id="pm-go" style="padding:10px;border-radius:500px;border:0;background:#1ed760;color:#000;font-weight:700;cursor:pointer">Create playlist</button>
      <div id="pm-log" style="max-height:240px;overflow:auto;font-size:13px;white-space:pre-wrap"></div>`;
    const $ = (id) => root.querySelector(id);

    $("#pm-go").onclick = async () => {
      const name = $("#pm-name").value.trim() || "New Playlist";
      const songs = parseSongs($("#pm-songs").value);
      const log = $("#pm-log");
      if (!songs.length) return Spicetify.showNotification("Paste at least one song", true);

      $("#pm-go").disabled = true;
      log.textContent = "";
      const uris = [];
      const missing = [];
      for (const [i, song] of songs.entries()) {
        try {
          const hit = await findTrack(song);
          if (hit) {
            uris.push(hit.uri);
            log.textContent += `✓ ${song}  →  ${hit.label}\n`;
          } else {
            missing.push(song);
            log.textContent += `✗ ${song}  (no match)\n`;
          }
        } catch (e) {
          missing.push(song);
          log.textContent += `✗ ${song}  (search failed: ${e?.message || e})\n`;
        }
        $("#pm-go").textContent = `Searching ${i + 1}/${songs.length}…`;
      }

      try {
        if (!uris.length) throw new Error("no songs matched");
        const playlistUri = await Spicetify.Platform.RootlistAPI.createPlaylist(name, { before: "start" });
        await Spicetify.Platform.PlaylistAPI.add(playlistUri, uris, { before: "end" });
        log.textContent += `\nCreated "${name}" with ${uris.length} songs.` + (missing.length ? ` ${missing.length} not found.` : "");
        Spicetify.showNotification(`Created "${name}" (${uris.length} songs)`);
      } catch (e) {
        log.textContent += `\nCould not create playlist: ${e?.message || e}`;
        Spicetify.showNotification("Playlist creation failed", true);
      }
      $("#pm-go").disabled = false;
      $("#pm-go").textContent = "Create playlist";
    };

    Spicetify.PopupModal.display({ title: "Playlist Maker", content: root, isLarge: true });
  }

  new Spicetify.Topbar.Button("Playlist Maker", "playlist", openModal);
})();
