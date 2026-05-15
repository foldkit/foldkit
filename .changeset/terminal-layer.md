---
'foldkit': minor
---

Add `foldkit/terminal` subpath: a Foldkit runtime for terminal UI apps built on [effect-boxes](https://github.com/lloydrichards/effect-boxes). The same Elm Architecture (`Model`, `Message`, `update`, `view`) with a terminal-native view layer. Views return an `effect-boxes` `Box<AnsiStyle>` so layout, color, padding, borders, flex, and grids all come from the wider Effect ecosystem rather than a Foldkit-specific renderer. Includes `makeTerminalProgram`, `runTerminal`, and `keyPressStream` for raw stdin input. `@effect/platform-node` and `effect-boxes` are optional peer dependencies — only required by apps that import `foldkit/terminal`.
