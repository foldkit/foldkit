# create-foldkit-app

## 0.12.4

### Patch Changes

- f1d8c31: Update the scaffolder's example catalog (the example list, descriptions, and copy) to match the current example set and the `Ui.*` Submodel / OutMessage shape that newly scaffolded apps target.

## 0.12.3

### Patch Changes

- 24b31c8: Update the Discord invite link.

## 0.12.2

### Patch Changes

- bb1eebd: Update Discord invite link.

## 0.12.1

### Patch Changes

- 5338579: Update README and template docs to recommend binding `const h = html<Message>()` inside view functions instead of at module level. The function-level binding accepts the function's actual Message type parameter (including `<ParentMessage>` for child views), keeps view functions portable across files, and removes the need to decide where the binding lives. Behavior unchanged.

## 0.12.0

### Minor Changes

- f10dffc: Bump bundled Effect dependencies to `4.0.0-beta.66`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

## 0.11.0

### Minor Changes

- c245d43: `create-foldkit-app` now accepts `bun` as a package manager alongside `pnpm`, `npm`, and `yarn`. The interactive prompt lists Bun as a choice, and `--package-manager bun` skips the prompt and uses it directly. Dependencies install with `bun add`, and the post-scaffold success message prints the matching `bun dev` command.

## 0.10.4

### Patch Changes

- deba7c0: Raise `engines.node` to `>=22.19.0` to match the actual runtime requirement. `@effect/platform-node` pulls `undici@8.x`, which requires Node 22.19. The previous `>=18.0.0` declaration was misleading — installs on older Node versions surfaced an `EBADENGINE` warning pointing at the transitive `undici` package rather than at `create-foldkit-app` itself. The runtime requirement is unchanged; this only corrects the manifest.

## 0.10.3

### Patch Changes

- 7354f7f: Fix `TypeError: state.value.asEffect is not a function` crash on startup. The pinned `@effect/platform-node@4.0.0-beta.64` declares its `@effect/platform-node-shared` dependency with a caret range, so npm would resolve a newer matching beta and pull a second `effect` version alongside the pinned one. The two Effect copies have incompatible runtime protocols, and `Effect.gen` blowing up on the first yield was the visible symptom. Pinning `@effect/platform-node-shared` to `4.0.0-beta.64` as a direct dependency forces npm to reuse the existing copy and prevents the duplicate install.

## 0.10.2

### Patch Changes

- a06493f: Slim the scaffolded `AGENTS.md` and point it at the live Foldkit code as the canonical reference.

  Two problems with the previous template:
  1. It was 215 lines and duplicated rules from the foldkit project's `CLAUDE.md` and the `foldkit-skills` plugin docs (a fourth source of truth). It also included Day-N material like the full Mount section that a freshly scaffolded project doesn't need on Day 1.
  2. It called `repos/foldkit/CLAUDE.md` the "canonical convention guide." That's wrong on two counts: `CLAUDE.md` is foldkit-repo-internal (has repo-specific scopes, file paths, dev rules) and isn't designed for consumer dev, and even within the foldkit repo, the live code (`examples/`, `packages/foldkit/src/`, the production apps) is more authoritative than any written summary.

  The new version focuses on the Day-1 bootstrap brief: framing, the subtree prompt, the critical idioms (`update`, `view`, `evo`, `Dom`, `html` factory, file split), the highest-frequency code-style rules, Message naming prefixes, and the DevTools pointer. It consistently treats the live Foldkit code as canonical. API-specific examples that drift on signature changes (e.g. the `Command.define` shape, which is curried and has already changed once) are replaced with prose plus pointers to the actual example files. Advanced patterns (Mount, ManagedResource, Submodels, OutMessage, Subscriptions, routing, accessibility) defer to the live code via a "Going Deeper" pointer.

  Existing scaffolded apps are unaffected. The change only affects new projects scaffolded with `create-foldkit-app`.

## 0.10.1

### Patch Changes

- 0a08c07: Recommend `git subtree` instead of `git submodule` for vendoring the Foldkit repo into a project so AI assistants can reference its source, examples, and docs.

  The post-scaffold success message now prints subtree commands, and the scaffolded `AGENTS.md` ships with a `subtree_prompted: false` flag (renamed from `submodule_prompted`) for agents to check on future sessions. The template also tells agents to treat the vendored `repos/foldkit/` as read-only reference and to import only from the `foldkit` npm package, not from relative paths into the subtree.

  ```bash
  git subtree add --prefix=repos/foldkit \
    https://github.com/foldkit/foldkit.git main --squash
  ```

  Unlike a submodule, a subtree is checked into the user's repository, so a fresh clone (a teammate, a CI runner, a cloud agent) has the Foldkit source on disk immediately with no `--recurse-submodules` step to remember.

- 209e074: Scaffold projects with a `main.ts` / `entry.ts` split.

  `src/main.ts` now holds the pure definitions (Model, Messages, init, update, view). A new `src/entry.ts` imports them and boots the runtime with `Runtime.makeProgram` + `Runtime.run`. `index.html` references `entry.ts`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect, eliminating the runtime-container error noise that appeared in test output when entry files were imported by Vitest.

  Existing scaffolded apps are unaffected. The runtime API is unchanged.

## 0.10.0

### Minor Changes

- 450a56d: Add `CustomElement.define` for binding native web components to Foldkit programs.

  Declare the element's properties and events with Schema once. `CustomElement.define` returns a spec; call `.withMessage<Message>()` inside a view module to mint a typed builder. Property factories become PascalCase methods, event factories become `On{PascalCase}` methods, all checked against the declared Schema. Property writes diff across renders, and `CustomEvent`s come back as Messages, with no manual property or event wiring at the call site.

  ```ts
  import { Schema as S } from 'effect'
  import { CustomElement } from 'foldkit'
  import 'vanilla-colorful/hex-color-picker.js'

  const hexColorPicker = CustomElement.define({
    tag: 'hex-color-picker',
    properties: {
      color: S.String,
    },
    events: {
      'color-changed': S.Struct({ value: S.String }),
    },
  })

  const picker = hexColorPicker.withMessage<Message>()

  picker([
    picker.Color(model.color),
    picker.OnColorChanged(detail => ChangedColor({ value: detail.value })),
  ])
  ```

  Also adds a `web-components` starter to `create-foldkit-app` demonstrating the API end-to-end with two real third-party web components (`vanilla-colorful` and `@shoelace-style/shoelace`) communicating through the Model.

## 0.9.1

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.9.0

### Minor Changes

- fb02feb: Add `generative-art` to the scaffold prompt. Selecting it produces a Perlin-noise flow field where particles trace organic curves, the cursor stirs a vortex influence, and clicks bloom radial bursts. Demonstrates `Canvas.view` with hundreds of evolving `Path` strokes, `Subscription.animationFrame` driving the simulation, and `devTools.excludeFromHistory` keeping the panel useful under high message rates.

## 0.8.0

### Minor Changes

- ef45ed5: Add `canvas-art` to the scaffold prompt. Selecting it produces a project that uses `foldkit/canvas` to render shapes into a `<canvas>` element, with `Subscription.animationFrame` and pointer events wired up.

## 0.7.2

### Patch Changes

- 1e6cb6c: Update the View section of the scaffolded `AGENTS.md` template to teach the new dotted-html convention: bind `const h = html<Message>()` per module (or `html<ParentMessage>()` inside a generic child view) and reach for elements, attributes, and event handlers via `h.div`, `h.OnClick`, etc. The previous template instructed users to call `html<Message>()` once in a dedicated `html.ts` file and re-export the destructured helpers, which contradicts the convention used in every Foldkit example.

## 0.7.1

### Patch Changes

- 61dc3fb: Bump `rimraf` to `^6.1.3` and `typescript` to `^6.0.3`.

## 0.7.0

### Minor Changes

- 40f43a9: Foldkit now targets Effect 4. **This is a breaking change.** For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

  ## Upgrade

  ```bash
  pnpm add effect@4.0.0-beta.59 foldkit@latest
  pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
  ```

  Pin `effect` to the exact version foldkit declares (`4.0.0-beta.59`). The pin is intentional during the v4 beta window — letting `effect` drift to a newer beta can break foldkit's runtime until foldkit re-pins.

  ## Foldkit changes

  ### Container element needs an `id`

  The DOM element you pass as `container` to `Runtime.makeProgram` must have a non-empty `id` attribute. `Runtime.run` errors with a clear message if it's missing. Most apps already use `<div id="root"></div>`; if yours doesn't, add an id.

  The id scopes HMR model preservation per-runtime. Foldkit's DevTools overlay manages its own container internally, so it doesn't conflict with your app. If you mount multiple Foldkit runtimes in the same page yourself, give each container a unique id.

  ### `@foldkit/vite-plugin` auto-includes Effect namespaces

  The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports would be missing from the prebundle and crash at runtime in dev. The plugin handles it transparently — no `optimizeDeps.include` entries needed in your config.

  ### `@foldkit/devtools-mcp` resilience

  The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

  ### `@foldkit/devtools-mcp` MCP tool registration fixed

  Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

  ### `create-foldkit-app` optional flags

  The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.

### Patch Changes

- 98519e1: Fix the install command in the READMEs. `create-foldkit-app` doesn't accept a `--wizard` flag — running with no flags drops into the interactive prompts. `--name`, `--example`, and `--package-manager` remain available as escape hatches that skip the matching prompts.

## 0.6.3

### Patch Changes

- 21a6d30: AGENTS.md template: document Mount with a `Mount.define` + `OnMount` example.

## 0.6.2

### Patch Changes

- 88c5bcc: Note Foldkit DevTools in the AGENTS.md template so agents reach for `foldkit_*` MCP tools before `console.log` when debugging running apps.

## 0.6.1

### Patch Changes

- 6426adb: Add DevTools MCP support so AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP) can connect to a running Foldkit app. Agents read the current Model, list and inspect Message history, replay to past states, and dispatch Messages into the runtime. The runtime's own Message Schema is published as JSON Schema so the agent discovers exactly what it can dispatch, and every payload is validated against the Schema before reaching the update loop.

  ## Migration

  The `devtools` config field on `Runtime.makeProgram` is now `devTools` (capital T). Type `DevtoolsConfig` is now `DevToolsConfig`.

  ```diff
   Runtime.makeProgram({
  -  devtools: { position: 'BottomRight' },
  +  devTools: { position: 'BottomRight' },
   })
  ```

  If you import the type directly:

  ```diff
  -import type { DevtoolsConfig } from 'foldkit'
  +import type { DevToolsConfig } from 'foldkit'
  ```

  ## What's new
  - **`foldkit/devtools-protocol`** (new entry point) exposes the typed `Request`/`Response`/`Event` Schemas and a browser-side WebSocket bridge that streams DevTools store updates to the relay.
  - **`DevToolsConfig.Message`** is a new optional field. When set to your app's `Message` Schema, the runtime publishes it as JSON Schema to the agent and validates every dispatched payload against it before reaching the update loop. Without it, dispatch is rejected; the read-only tools still work.
  - **`@foldkit/vite-plugin`** accepts a new `devToolsMcpPort` option. When set, the plugin opens a WebSocket relay on that port that forwards traffic between connected browser tabs and any external MCP client. Without it, HMR behavior is unchanged. The relay only runs at dev time; production builds never include it.
  - **`@foldkit/devtools-mcp`** is a new package: an MCP server that runs as a Node child process spawned by your AI agent. Run `npx @foldkit/devtools-mcp init` in your project root to register it. See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.
  - **`create-foldkit-app`** scaffolds new projects with `@foldkit/devtools-mcp` installed as a dev dependency, a `.mcp.json` registering the server, and a `vite.config.ts` that passes `devToolsMcpPort: 9988` to the Foldkit plugin.

## 0.6.0

### Minor Changes

- 8364888: Add `crash-view`, `job-application`, `kanban`, and `pixel-art` to the `--example` choice list. These four examples already shipped in the monorepo and on the website but were missing from the create-foldkit-app selectable list, so users could not scaffold them via `pnpm create foldkit-app`. Reorder the choice list and CLI help descriptions to match the website's example ordering.

## 0.5.17

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.5.16

### Patch Changes

- 4400851: Fix `create-foldkit-app` failing on Windows. Use `where` instead of `which` for package manager lookup, and run install commands through the shell so Windows can resolve the `.cmd` shims that npm, pnpm, and yarn ship as.

## 0.5.15

### Patch Changes

- e72bd7f: Wire Scene matchers into the scaffolded project. The base template now ships
  `src/vitest-setup.ts` (three lines: `import { setup } from 'foldkit/test/vitest'; setup()`) and `vitest.config.ts` registers it via `setupFiles`. Previously,
  projects scaffolded with `--example form|weather|todo|auth|kanban|pixel-art`
  pulled in the example's `src/vitest-setup.ts` and scene tests but never ran the
  setup file — Scene matcher assertions would fail at runtime.

## 0.5.14

### Patch Changes

- 60f1594: Use a precise optimizeDeps entry point (src/main.ts) so Vite's dependency scanner never crawls into the repos/ submodule.

## 0.5.13

### Patch Changes

- 015c96a: Scaffold vitest configuration in new projects. Adds `vitest.config.ts` with `server.deps.inline: ['foldkit']` so tests resolve foldkit through Vite's bundler pipeline, a `test` script in `package.json`, and vitest and happy-dom as dev dependencies.

## 0.5.12

### Patch Changes

- 321dac6: Update AGENTS.md template to use `toParentMessage` (renamed from `toMessage`).

## 0.5.11

### Patch Changes

- c6a5404: Add testing section to AGENTS.md template pointing agents to `foldkit/test` and the submodule's exemplar test files

## 0.5.10

### Patch Changes

- f456720: Exclude submodule directory from Vite dependency scanner to prevent resolution errors

## 0.5.9

### Patch Changes

- bdd444e: Add `git init` to CFA success message and use `>` prompt prefixes for shell commands

## 0.5.8

### Patch Changes

- c416561: Indent the AI-Assisted Development section body in the success message and title-case the header

## 0.5.7

### Patch Changes

- 8817558: Add AI-assisted development section to success message with submodule setup instructions.

## 0.5.6

### Patch Changes

- 9f3cde2: Add newsletter signup link to success message

## 0.5.5

### Patch Changes

- 964e13f: Rewrite scaffolding success message with personality. Fix object-first naming rationale in AGENTS.md template.

## 0.5.4

### Patch Changes

- 4b81a10: Update GitHub URLs from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.

  Update AGENTS.md template to replace `NoOp` guidance with `Completed*` message conventions.

## 0.5.3

### Patch Changes

- 8b27c43: Update scaffolding success message with personal note and links to GitHub issues and social

## 0.5.2

### Patch Changes

- 1369d6a: Use `repos/` convention for submodule path. Submodules now clone into `repos/foldkit` instead of `./foldkit`. Updated Prettier, ESLint, and editor ignore configs.

## 0.5.1

### Patch Changes

- 7c0a3b7: Sync AGENTS.md template conventions with CLAUDE.md to keep scaffolded projects aligned with current Foldkit coding standards.

## 0.5.0

### Minor Changes

- 8c9e95f: Add ui-showcase as a starter template showing every Foldkit UI component with sidebar navigation and routing.

## 0.4.3

### Patch Changes

- 15e6c87: Update base template formatting to printWidth 80 and refresh example descriptions.

## 0.4.2

### Patch Changes

- 7b164d1: Read CLI version from package.json at runtime instead of hardcoding it.

## 0.4.1

### Patch Changes

- 4ee0289: ### Fixes
  - **Update template to use subscription naming** — align starter template with the command stream to subscription rename

## 0.4.0

### Minor Changes

- 5ff61e0: ### Features
  - **AGENTS.md and .ignore in starter template** — new projects now ship with an AGENTS.md file and a .ignore file for better AI assistant and tooling support

## 0.3.2

### Patch Changes

- 598f974: Enable noUncheckedIndexedAccess in project template tsconfig
