# PixelForge (Elm)

The Elm implementation of the pixel art editor used in the
[Foldkit vs Elm: Side by Side](https://foldkit.dev/elm/foldkit-vs-elm-side-by-side)
comparison. Same features, same styling, and same algorithms as the
[Foldkit version](../../examples/pixel-art) and the
[React version](../pixel-art-react): grid drawing with brush, fill, and eraser
tools, mirror modes, undo/redo with a time-travel history panel, palette
themes, localStorage persistence, PNG export, and keyboard shortcuts.

## Running

This app has no npm dependencies. It needs only the
[Elm compiler](https://guide.elm-lang.org/install/elm.html):

```sh
elm make src/Main.elm --optimize --output=elm.js
```

Then serve the directory with any static file server and open `index.html`:

```sh
npx serve .
```

## Where things live

- `src/Main.elm`: Model, Msg, update, view, subscriptions, and ports.
- `src/Grid.elm`: grid construction, pixel updates, flood fill, mirroring, and
  history helpers.
- `src/Palette.elm`: palette themes and color resolution.
- `index.html`: the JavaScript side of the ports. localStorage persistence and
  canvas-based PNG export live here, because Elm code cannot reach those
  browser APIs directly.

Styling uses the Tailwind Play CDN so the app stays dependency-free. The class
names are identical to the React and Foldkit versions.
