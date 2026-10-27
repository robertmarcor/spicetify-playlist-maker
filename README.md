# Playlist Maker

A [Spicetify](https://spicetify.app) extension: paste a list of songs, get a Spotify playlist.

![preview](preview.png)

## Use

1. Click the **Playlist Maker** button in Spotify's top bar.
2. Type a playlist name and paste your songs, one per line. Markdown checklists (`- [ ] song`) work too; headings and notes are ignored.
3. Click **Create playlist**. Each line is searched and the top match is added. The log shows what matched (✓) and what didn't (✗).

Tip: "artist – title" matches better than lyrics.

## Install

From the Spicetify Marketplace, or manually:

```bash
cp playlistMaker.js "$(spicetify path userdata)/Extensions/"
spicetify config extensions playlistMaker.js
spicetify apply
```
