# Playlist Maker

Turn an AI-generated song list into a real Spotify playlist, for free.

![preview](preview.png)

## Why

AI chatbots are great at playlist ideas: "100 songs like my emo playlist", "a road-trip mix of 2000s pop-punk". But getting those songs into Spotify is the hard part. Their Spotify integrations usually can't create playlists on a free account (Claude's Spotify connector, for example, needs Premium for that), so you end up adding songs one by one.

Playlist Maker is the bridge. Ask any AI for a markdown list of songs, paste it into Spotify, and the extension finds each song and builds the playlist for you. It runs inside your own Spotify app through [Spicetify](https://spicetify.app), so there's no API key, no extra login, and no Premium needed.

## Use

1. Ask an AI for a song list, for example:

   > Make me a markdown checklist of 50 songs similar to Paramore and Fall Out Boy, one per line, formatted as `- [ ] Title - Artist`.

2. Click the **Playlist Maker** button in Spotify's top bar.
3. Under **Add to**, pick **New playlist** and give it a name, or pick one of your existing playlists.
4. Paste the AI's whole answer. Only the list lines are used; headings and notes are ignored.
5. Click **Create playlist** (or **Add to playlist**). The log shows what each line matched:
   - ✓ added
   - • already in the playlist, skipped
   - ✗ no match found

Tip: "Title - Artist" matches far better than lyrics or vague descriptions. If a line picks the wrong song, fix it and run the list again. Songs that are already in the playlist won't be added twice.

## Install

From the Spicetify Marketplace (search "Playlist Maker"), or manually:

```bash
cp playlistMaker.js "$(spicetify path userdata)/Extensions/"
spicetify config extensions playlistMaker.js
spicetify apply
```
