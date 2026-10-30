# ChessLens

ChessLens is a static, browser-based chess move analyzer for viewing a chess game on another screen with an iPhone camera. Board recognition, turn tracking, and Stockfish analysis run on-device. Camera frames are not uploaded.

## Run and deploy

Serve this folder from a static web host over HTTPS. The camera API requires a secure context, so opening `index.html` directly from a file browser will not work. No server runtime or database is needed.

To deploy on GitHub Pages, create a new repository, add every file in this folder at the repository root, then enable Pages for the default branch. Other static hosts work too. Keep the model, Stockfish JavaScript/WebAssembly files, and the license files together with `index.html`.

On iPhone, open the HTTPS site in Safari, allow camera access, then use Share → Add to Home Screen for a full-screen app-like view.

## Use

1. Start the camera and frame the complete chessboard on the other screen.
2. Select **White** or **Black** for the side you are playing.
3. ChessLens tracks legal moves and shows one recommendation only when it is your turn. It waits while the opponent is to move.

For the most reliable turn tracking, start with the game at its initial position. If you open the camera during a game, ChessLens estimates whose turn it is from the selected color until it sees the next moves.

## Files and licensing

This is a no-build static app. There is no `package.json` because the browser loads the files directly. The chess rules library and Stockfish engine are distributed under their respective licenses in `CHESSJS-LICENSE-BSD.txt` and `STOCKFISH-LICENSE-GPL3.txt`.

The bundled Stockfish.js WebAssembly engine is based on Stockfish 19. Its build project and corresponding source are available at [nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js); the upstream chess engine source is [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish). Keep the GPL license and source links with any redistributed copy.
