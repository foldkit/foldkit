# Website and Typing Game organization

This checkpoint applies the child `blocks/` organization and named UI subpath imports to the actual Website and Typing Game applications. It changes module ownership and imports without adding an authoring API.

## Source organization

- Website moves 224 TypeScript files into ten root-owned child directories and two nested Home children. Playground's preview and WebContainer helpers and their tests move with the owning Playground Block.
- Typing Game moves 41 TypeScript files into `src/blocks/home` and `src/blocks/room`.
- Explicit `blocks/index.ts` barrels expose child contracts and feature namespaces. Child barrels retain their existing contract and Layer exports; original Commands remain accessible to owning tests through structural imports.
- Markdown and static document renderers stay under Website `src/page`. UI and Coming from React runtime modules import their original Markdown from there.
- A passive declaration such as `fileTabs.ts`, which specializes the library's Tabs contract without implementing another child Block, stays a small declaration module.
- ExampleDetail's single-use Mount inventory is inline in its Composition. There were no standalone exported Binding arrays to remove. Actual named Subscription and ManagedResource registries remain where their implementation, handlers, or tests use them.

The migration updates 130 active Website files to named UI subpath imports, 29 active source-link files, and the organization snippets. Published Markdown and dedicated release snippets remain unchanged. The published 0.167 renderer only receives the two relative-import changes needed to reach its relocated live UI implementation.

## Verification

The normal application commands use the repository's existing packages and scripts. This machine uses Node 22.22.3 and the prepared pnpm 11.8 wrapper. `FOLDKIT_PNPM_EXECUTABLE` selects that wrapper for workspace discovery; the unpinned global launcher otherwise attempted package-manager registry verification in the sandbox. No application or test workaround bypasses that discovery.

| Check                                        | Result                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Website and Typing Game source typechecks    | Pass                                                                                                                |
| Application lint with `.oxlintrc.app.json`   | Pass                                                                                                                |
| Effect lint over both applications           | Pass                                                                                                                |
| Import-cycle scans of both applications      | Zero cycles                                                                                                         |
| Website existing runtime suite               | 39 files, 1,528 tests pass                                                                                          |
| Typing Game existing runtime suite           | 3 files, 30 tests pass                                                                                              |
| Website snippet verifier                     | 128 complete roots, 9 runtime tests, emitted and strict relocated consumers, two declaration mutation controls pass |
| Website final production build and prerender | Pass; 225 routes, 224 Markdown pages                                                                                |
| Pagefind postprerender                       | 225 pages indexed                                                                                                   |
| Existing rendered-docs Chromium smoke        | Six tests pass                                                                                                      |

The final snippet receipt is `internal/layered-constructor/website-snippets/verification-JJDw6v/results.json`. It also verifies the original hashes of 33 historical snippet files and audits 515 active snippets for superseded APIs. Partial excerpts are not represented as independently compiling applications.

An audit of the original and relocated tests preserves all 330 static test/it callsites and 726 expect callsites across 42 files. Those counts establish that assertion callsites were not removed; the actual test runs provide the behavior evidence. The Markdown/demo test now reads live UI source from `blocks/ui` while retaining every original demo-registration assertion.

`website-typing-layout-moves.json` records the exact file moves. Build output, browser output, and temporary verification directories are not migration source.

## Production and browser checks

The final normal Website build runs after the final Vite plugin rebuild and includes the corrected update-composition guidance. TypeDoc reports zero errors; its existing unresolved-symbol warnings and the client chunk-size warnings are not suppressed.

The normal prerender command builds both the server entry and prerender script successfully. Chromium's first launch is denied by the sandbox's macOS bootstrap-port restriction before rendering begins. Retrying that exact built prerender bundle with browser permission succeeds, followed by the normal `postprerender` script. It produces 261 OG images, 35 Playground metadata shells, 225 rendered routes, 224 Markdown pages, and 232 content-API JSON documents. Pagefind indexes 225 pages.

The unchanged `e2e/smoke.spec.ts` runs through the normal Playwright config on port 4187. All six tests pass: API-reference navigation, HoverIntent closing, mobile Dialog focus, Combobox selection, and both Search entry points. It emits development slow-render diagnostics and a nonfatal DevTools-overlay Model-preservation warning; this is not a performance or warning-free-console claim. Playwright exits normally, and a listener check confirms port 4187 is closed.

The compact `website-typing-layout-results.json` records source and artifact hashes, commands, counts, and verification-log hashes. It keeps the sandbox launch failure distinct from the successful browser-permitted retry.
