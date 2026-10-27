# Playlist Maker

Turn an AI-generated song list into a real Spotify playlist, for free.

![preview](preview.png)

## Why

Want to make a quick playlist with low effort? AI can easily generate a list of songs for you. Just give an LLM a prompt, for example:

- "Give me 20 songs from artists like X, Y and Z."
- "I'm going on a road trip, give me some sing-along songs."
- "There's a song that goes 'is this the real life, is this just fantasy', what's it called?" Don't know the title or artist? Just give the AI a lyric or describe the song, and it can usually guess the right one.

The catch is that having AI add the songs to Spotify for you requires Premium.

That's why I made this. It's free and works with a free Spotify account. The AI makes a markdown list, you copy and paste it, done. All you need is [Spicetify](https://spicetify.app): no API key, no extra login and no Premium.

## Use

1. Ask an AI for a song list, for example:

   > i like Levitating by Dua Lipa and Blinding Lights by The Weeknd. find me 30 more songs like that and some remixes too. make it a markdown list like `- [ ] Title - Artist`

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
