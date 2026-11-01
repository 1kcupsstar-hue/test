# Anime Quiz Live

A small real-time multiplayer quiz website. One person hosts a room and supplies a YouTube quiz video; everyone else joins with a four-character room code. Players submit one text answer per question. The host controls the question number, closes submissions, and sets the accepted answer(s) and points. Scores and answer history update live. Finished games are saved in `data.json`.

## Run locally

1. Install Node.js 18 or newer.
2. Unzip this folder and open a terminal in it.
3. Run `npm install`.
4. Run `npm start`.
5. Open `http://localhost:3000` on the host computer.
6. Create a room with the YouTube URL. Share the room code and the site's network/public URL with players.

For players on the same Wi-Fi, use the host computer's local IP address instead of `localhost` (for example `http://192.168.1.20:3000`). Allow Node through the computer firewall if prompted.

## How to host a game

- Paste a YouTube watch/share URL and create the room.
- Share the room code with players.
- Play the video. Use the question number control to open each question.
- Before players answer, enter accepted answer(s). Separate alternatives with `|`, e.g. `Luffy|Monkey D. Luffy`, then set the point value.
- Players can submit once per question. Close submissions when time is up.
- Set the next question number to open the next round.
- Finish the game to save the result to the server's `data.json` file. The host can refresh saved game history.

## Important notes / current MVP limits

- This is a starter MVP, not a production-hosted service. It is designed for one Node server process.
- To play across the internet, deploy the folder to a Node hosting provider and use HTTPS. Keep the server running for the whole game.
- The server stores completed games in a local JSON file. For a production multi-room service, use a database (e.g. PostgreSQL) and add host authentication, persistent player identities, reconnect handling, and room cleanup.
- The video is embedded from YouTube. It is not downloaded or modified. Some videos may block embedding; the host should check that the video's owner allows embedding.
- The video itself is not automatically split into questions. The host advances the question number when the video reaches each prompt. Players watch the same embedded video; synchronized playback controls are not included in this first version.
- Matching is exact after trimming and lowercasing. Add accepted variants separated by `|`. For image/audio identification questions, the player answer is typed as text.
- The host should set the answer key before answers are submitted for automatic scoring. If set afterward, clicking "Set answer key / score" will score answers already received.
