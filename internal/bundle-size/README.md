# Foldkit consumer bundle sizes

This harness builds small browser consumers against the compiled workspace
packages through their published export maps. It uses Vite 8, Oxc minification,
an ES2022 target, and `@foldkit/vite-plugin`. It does not use the source aliases
that the examples use in development.

From the repository root, build the packages and run the profile:

```sh
pnpm --filter @foldkit/ui... build
pnpm profile:bundle-size
```

`pnpm check:bundle-size` compares each fixture with `baseline.json` and checks
that unrelated packages stay out of the small bundles. After an intentional
bundle change, run `pnpm update:bundle-size-baseline` and review the new
baseline, the generated website table, and `dist/report.json`. CI uploads that
detailed report as an artifact and checks that the table matches the baseline.

## Fixtures

| Fixture                                        | What it retains                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `empty`                                        | A browser entry with no dependencies                                                                   |
| `effect`                                       | A runtime Schema decode                                                                                |
| `counter`                                      | A working Foldkit application with one Message and one button                                          |
| `hydrated-counter`                             | The same counter booted with server DOM adoption                                                       |
| `recording-counter`                            | The counter with production DevTools recording opted in                                                |
| `button-root` / `button-deep`                  | The same working Button application, imported from the root or component subpath                       |
| `dialog`, `popover`, `combobox`, `date-picker` | The counter plus each component's Model, Message, init, update, and view API (or the Combobox factory) |
| `popover-root`                                 | The same Popover API probe through the UI root barrel                                                  |
| `lazy-popover`                                 | The working counter plus a deferred Popover subpath import                                             |
| `typing-game`                                  | The real Typing Game client, including routing, Submodels, Commands, Subscriptions, and CSS            |

The component probe fixtures expose their APIs on `globalThis`, so the
bundler must retain them. The lazy Popover probe exposes a function that
imports the component only when called. These fixtures measure loading costs
in an application that already uses Foldkit. They do not exercise the
component in the DOM or model the additional code a particular consumer might
write. The numbers are incremental comparisons within this fixture set, not
standalone package sizes or additive component prices.

## Reading the report

The headline values are exact byte lengths of the emitted JavaScript and CSS
files. gzip uses level 9; Brotli uses quality 11. Each asset is compressed
separately before the sizes are summed, matching browser transfers. Static
imports of the entry chunk count as initial bytes; chunks reached only through
dynamic imports count as lazy bytes. The Typing Game app emits CSS; the small
API fixtures do not. `lazy-popover` defers the Popover API itself.

`dist/report.json` also lists every retained module and its
`renderedLength`, grouped by package. This is useful for finding which source
modules to inspect. Rolldown's module lengths do not add up to final emitted
bytes, and compressed bytes cannot be attributed accurately to individual
modules. Use the asset totals for size claims and the module list for leads.

The committed baseline permits at most 5% growth or 1 KiB of compressed
growth (4 KiB raw), whichever is larger, per fixture and phase. A current
release feature may legitimately exceed that budget; update the baseline with
the feature and inspect the attribution. The tree-shaking checks are separate:
the core fixture must not retain UI or Floating UI, Button must not retain
Floating UI, and browser fixtures must not retain Foldkit test code, parse5,
or the development WebSocket bridge. The root Button and Popover imports must
remain close to their deep imports in gzip size.

The counter and Typing Game builds must not retain hydration adoption or
DevTools recording modules. Both are fresh production boots without a
production DevTools overlay. The hydrated counter must retain DOM adoption,
and the recording counter must retain the DevTools integration and store.

The lazy Popover fixture must retain UI and Floating UI only in its deferred
chunk. The eager Popover and DatePicker fixtures currently include Floating UI
in their initial bundles.
