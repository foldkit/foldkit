# create-foldkit-app

## 0.25.0

### Minor Changes

- 3feb9ba: Bump bundled Effect dependencies to `4.0.0-rc.108`, the first Effect v4 release candidate. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-rc.108` to match this release (exact versions, not ranges, while Effect v4 is in prerelease).

## 0.24.5

### Patch Changes

- 87e9dbf: Bump bundled Effect dependencies to `4.0.0-beta.107`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.107` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.4

### Patch Changes

- 14bb759: Correct the scaffolded `AGENTS.md` testing guidance and relax its Message layout rule. Scene tests do not always run from the root `update`/`view`, so the template no longer claims a single root-level `scene.test.ts` is the right home for a multi-page app. It now says a test file lives in the folder holding the code it drives, blesses a page-scoped `scene.test.ts` for behavior that page owns, keeps the root-level file for flows that cross pages, and points at `repos/foldkit/examples/auth` for the shape. The Message layout section keeps one unbroken block of `m()` declarations as the rule for small unions and allows blank-line thematic clusters once a union grows past roughly a dozen Messages, with `S.Union([...])` and `type Message` still adjacent directly after the declarations.

## 0.24.3

### Patch Changes

- 84050fc: Bump bundled Effect dependencies to `4.0.0-beta.106`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.106` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.2

### Patch Changes

- 40ccffe: Bump bundled Effect dependencies to `4.0.0-beta.105`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.105` to match this release (exact versions, not ranges, while Effect v4 is in beta).

## 0.24.1

### Patch Changes

- c947f47: Bump bundled Effect dependencies to `4.0.0-beta.103`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.103` to match this release (exact versions, not ranges, while Effect v4 is in beta).

- c9b3dd3: Let the Foldkit Vite plugin mount the installed DevTools overlay automatically. Development dependencies stay out of production builds, while a regular dependency makes `show: 'Always'` sufficient to include the overlay in production. Keep `@foldkit/devtools` in generated applications' development dependencies.

  Installing `@foldkit/devtools` is now the whole opt-in: an application that never configured `devTools` gets the overlay in development as soon as the package is present. Set `devTools: false` to turn DevTools off, or uninstall the package to drop the overlay alone.

  This removes `DevToolsConfig.overlay`, the `DevToolsOverlay` export from `foldkit/runtime`, and the bare `overlay` export from `@foldkit/devtools`. Remove the overlay import and configuration field when upgrading. The Vite plugin now owns that integration through `@foldkit/devtools/vite`.

  Upgrade `foldkit`, `@foldkit/vite-plugin`, and `@foldkit/devtools` together. The plugin injects the overlay only when the installed `@foldkit/devtools` exposes `@foldkit/devtools/vite`, so an older copy skips the overlay instead of failing the build. Thanks @artile for the report.

  ## Migration

  Drop the `overlay` import and the `overlay` field. The Vite plugin mounts the overlay whenever `@foldkit/devtools` is installed, so `devTools` now carries configuration alone.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      position: 'BottomLeft',
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      position: 'BottomLeft',
    },
  })
  ```

  An application whose only `devTools` field was `overlay` drops the object entirely and still gets the overlay in development.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: { overlay },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
  })
  ```

  Shipping the overlay in production keeps `show: 'Always'` and moves `@foldkit/devtools` from `devDependencies` to `dependencies`. Dependency placement is the build-time boundary, and `show` controls whether the runtime mounts it.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })
  ```

  An application that imported `DevToolsOverlay` from `foldkit/runtime` to type its own wiring no longer needs the type.

## 0.24.0

### Minor Changes

- 08560ba: Add the `view-transitions` example: a gallery whose artwork grows from grid card to detail hero through the browser's View Transitions API, demonstrating the runtime's `viewTransition` option, shared-element morphs via `viewTransitionName`, and direction-aware transition types derived from the route pair.

### Patch Changes

- 23423bd: Element builders now take their children argument optionally. `h.div([h.Class('divider')])` and `h.div([h.Class('divider')], [])` build the same vnode, so an element with no children no longer needs a trailing empty array. Attributes stay required, so `h.div([])` remains the spelling for an element with neither. Void elements such as `img`, `input`, and `br` are unchanged and still accept attributes only. The scaffolded app's `AGENTS.md` teaches the shorter form.

## 0.23.2

### Patch Changes

- 1c6ed84: Breaking: align Command result pairs with the effects they represent.

  The convention already said `Completed*` mirrors the Command name verb-first, but it was written as a rule for fire-and-forget acknowledgments, so Commands that resolved to a value drifted into conjugating their own verb instead: `DetermineStartTime` produced `DeterminedStartTime`, `GenerateCardId` produced `GeneratedCardId`, `SaveTodos` produced `SavedTodos`. Those names read like facts that arrived on their own, which hides the Command→Message pair in a DevTools timeline and in Story and Scene tests.

  A payload does not change the rule. A Command whose result cannot meaningfully fail names that result `Completed<Command>` and carries the value as the payload. `Succeeded*`/`Failed*` still cover Commands that can fail. The one exception is a Message with more than one cause: when several Commands resolve to the same Message, or a Command synthesizes a Message another source also emits, name it for the fact. `EndedAnimation` stays as it is because both the `WaitForAnimationSettled` Command and each component's `DetectMovementOrAnimationEnd` race produce it.

  Derive the result only after checking that the Command itself names the effect its `execute` body performs. Timer Commands that only wait now say so instead of claiming the later Model transition.

  ## Migration

  Renamed Command result pairs on `@foldkit/ui`:

  | Component     | Command                                | Message                                                 |
  | ------------- | -------------------------------------- | ------------------------------------------------------- |
  | `Animation`   | `RequestFrame` → `WaitForPaint`        | `AdvancedAnimationFrame` → `CompletedWaitForPaint`      |
  | `DragAndDrop` | `ResolveKeyboardMove`                  | `ResolvedKeyboardMove` → `CompletedResolveKeyboardMove` |
  | `Listbox`     | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
  | `Menu`        | `DelayClearSearch`                     | `ClearedSearch` → `CompletedDelayClearSearch`           |
  | `Toast`       | `DismissAfter` → `WaitBeforeDismissal` | `ElapsedDuration` → `CompletedWaitBeforeDismissal`      |
  | `Tooltip`     | `ShowAfterDelay` → `WaitBeforeShowing` | `ElapsedShowDelay` → `CompletedWaitBeforeShowing`       |

  Apps reference these when they resolve a component Command in a Story or Scene test, or match on a component Message they forwarded through `Got*`. Update both names in those call sites when the Command changed.

## 0.23.1

### Patch Changes

- 35c2560: Correct the root view example in the 0.134.0 migration guide. The snippet returned an `Html` value annotated as `Document`, which does not compile. `Document` is `{ title, body, ... }`, so both the before and after form now return that struct.
- cf98218: Rename the Scene and Story `with` step to `given`.

  `Scene.with` and `Story.with` are now `Scene.given` and `Story.given`. Story's exported `WithStep` type is now `Story.GivenStep`. Scene's equivalent stays module-private, as it was before; `Scene.SceneStep` is the exported step type there.

  `with` is a reserved word, so it could never be a named import binding. The module worked around that internally by defining `with_` and exporting it as `with`, which kept `Story.with` readable at the cost of forcing `import { with as with_ }` on anyone importing the steps by name. `given` has no such problem, reads the same in both call styles, and names what the step does: it establishes the precondition the rest of the chain runs against. It also lines up with the Given/When/Then vocabulary the steps already follow, since a story is `given`, then `message`, then `model`.

  ## Migration

  Rename the step at every call site.

  ```ts
  // before
  Story.story(update, Story.with(model), Story.message(Clicked()))
  Scene.scene({ update, view }, Scene.with(model), Scene.click(role('button')))

  // after
  Story.story(update, Story.given(model), Story.message(Clicked()))
  Scene.scene({ update, view }, Scene.given(model), Scene.click(role('button')))
  ```

  If you referenced the step type, rename it too:

  ```ts
  // before
  const step: Story.WithStep<Model> = Story.with(model)
  // after
  const step: Story.GivenStep<Model> = Story.given(model)
  ```

  ## Importing the steps by name

  Because `given` is a legal binding, a test file can now import the steps it uses instead of the whole namespace, which removes the prefix from every call site:

  ```ts
  import { Command, given, message, model, story } from 'foldkit/story'

  test('restarting resets the score', () => {
    story(
      update,
      given(playingModel),
      message(PressedKey({ key: 'r' })),
      model(model => {
        expect(model.points).toBe(0)
      }),
      Command.expectHas(GenerateApplePosition),
    )
  })
  ```

  A test file normally needs only one of the two testing modules, so this reads well in practice. When one file tests both a story and a scene, keep the namespace imports so `Story.given` and `Scene.given` stay distinguishable.

## 0.23.0

### Minor Changes

- a313fc4: Supply the html builder from the render frame.

  `html<Message>()` is removed. It returned a process-wide singleton cast to a caller-chosen type, so the Message type parameter was a phantom: the developer wrote it and the runtime ignored it. A shared view helper that named the app's Message worked at the root and broke inside a Submodel, because the boundary rejected the foreign Message when the handler fired. `Html` is not parameterized by Message, so nothing caught it at compile time.

  The builder now comes from the frame that renders the view and cannot be conjured, so the Message type can no longer disagree with the boundary that will dispatch it.

  ## Migration

  Views receive `h` as their last parameter. Delete the line that built it.

  ```ts
  // before
  export const view = (model: Model): Document => {
    const h = html<Message>()
    return {
      title: 'Example',
      body: h.div([], [h.button([h.OnClick(Clicked())], ['go'])]),
    }
  }

  // after
  export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: 'Example',
    body: h.div([], [h.button([h.OnClick(Clicked())], ['go'])]),
  })
  ```

  The same applies to `crash.view`, which now takes `(context, h)`, and to `Scene.scene`'s `view`.

  Submodel views take the builder after their view inputs:

  ```ts
  // before
  Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs) => { ... })
  // after
  Submodel.defineView<Model, Message, ViewInputs>((model, viewInputs, h) => { ... })
  ```

  A view helper defined at module level takes the builder as its last parameter, and callers pass it along:

  ```ts
  const rowView = (item: Item, h: HtmlBuilder<Message>): Html => ...
  ```

  A memoized helper receives it through the existing args array. The builder is referentially stable, so memoization is unaffected:

  ```ts
  lazyRow(rowView, [item, h])
  ```

  Where no builder is in scope, typically module scope, use `inertHtml`. It is typed `HtmlBuilder<never>`, so element and attribute constructors work while every event-handler constructor is uncallable. Its attributes are `Attribute<never>` and flow into any Message universe by covariance, which also makes it the builder for library code emitting handler-free attribute bundles:

  ```ts
  import { inertHtml as ih } from 'foldkit/html'

  const PagefindBody = ih.DataAttribute('pagefind-body', '')
  ```

  Inside a view, use the view's own `h`. The view already holds a builder, and reaching past it is the habit that made a caller-chosen Message type possible to begin with.

  `@foldkit/ui` components take the consumer's builder as their last argument, and the explicit type argument goes away because it is inferred from the builder:

  ```ts
  // before
  Button.view<Message>({ toView, onClick: Clicked() })
  // after
  Button.view({ toView, onClick: Clicked() }, h)
  ```

  `Canvas.view(config, h)` and the `CustomElement` spec's `withMessage(h)` follow the same shape.

  `crash.view` receives `HtmlBuilder<never>`, not the app's builder. The crash view renders after the dispatch loop has stopped, so a Message it produced could never reach `update`. `never` makes that structural: `h.OnClick(...)` is a compile error rather than a handler that silently does nothing, and a reload control uses `h.Attribute('onclick', 'location.reload()')` as before.

  `DragAndDrop.droppable` and `DragAndDrop.sortable` lose their type parameter and return `ReadonlyArray<Attribute<never>>`. Both produce only data attributes, never handlers, so `never` is the accurate Message type and the result flows into any Message universe by covariance. Drop the explicit type argument: `droppable<Message>(id)` becomes `droppable(id)`. `DragAndDrop.draggable` is unchanged and stays parameterized, because it does dispatch.

  The stateless `@foldkit/ui` helpers name their type parameter `Message`. Button, Fieldset, Input, RadioGroup, Select, and Textarea previously called it `ParentMessage` while Checkbox, Disclosure, and Switch called it `Message`, though none of them opens a Submodel boundary, so there is no child Message for a parent to be named against. Components that do lift a child Message, such as DragAndDrop, keep `ParentMessage`. Type parameter names are not part of the type contract, so call sites are unchanged.

  `h.submodel` now types the lift: `toParentMessage` must return the embedding builder's Message, where it previously returned `unknown`. Lifting into the wrong Message union is a compile error.

  `childAttributes` and slotted Submodels are unchanged.

  ## Testing a view

  A view can no longer be called directly in a test, because there is no way to produce a builder outside a render. Render through the `Scene` harness instead, which supplies one the same way the runtime does. Tests that asserted on the result of `view(model)` become tests that assert on what the scene rendered.

  ## What this does not cover

  A view can still assign its builder to module state where another frame reads it. TypeScript cannot express the restriction that would prevent that, so treat a stored builder as a bug the types will not catch.

- 26c97cc: Rename the `checkout-machine` example to `state-machine`. The scaffolded app is unchanged; only the example's name moved. Scripts passing `--example checkout-machine` should pass `--example state-machine` instead.

## 0.22.2

### Patch Changes

- d16d7f7: Bump bundled Effect dependencies to `4.0.0-beta.102`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.102` to match this release (exact versions, not ranges, while Effect v4 is in beta).

- e3a5f5d: Fix the Effect array predicate names in the scaffolded `AGENTS.md`. The template told agents to use `Array.isEmptyArray` / `Array.isNonEmptyArray`, which Effect does not export. The correct names are `Array.isArrayEmpty` / `Array.isArrayNonEmpty`. The same rule now also prohibits `.length > 0`, not just `.length === 0`.

## 0.22.1

### Patch Changes

- 95118d8: Bump bundled Effect dependencies to `4.0.0-beta.101`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI now pins `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to exactly `4.0.0-beta.101` (exact versions, not ranges, while Effect v4 is in beta).

## 0.22.0

### Minor Changes

- 2fbc8dd: Rename the `upload` example to `interrupting-commands`. The scaffolded app is unchanged; only the example's name moved. Scripts passing `--example upload` should pass `--example interrupting-commands` instead.

## 0.21.1

### Patch Changes

- 96167d1: Bump bundled Effect dependencies to `4.0.0-beta.97`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.97` exactly during the v4 beta window.

- d3d7a7f: Update the keying rule in the generated `AGENTS.md`: key every view branch even when the branch root tags differ, key inline branch roots directly instead of introducing a wrapper element only to carry a key, and key a single wrapper at the branch site when the branches delegate to other view functions.

## 0.21.0

### Minor Changes

- 426b4a3: Add the `checkout-machine` example: a checkout workflow built on the experimental `foldkit/experimental/machine` module, demonstrating guarded `when` branches and edge Commands.
- 0029a3d: Add the `route-transitions` example: a gallery app with a live transition log, demonstrating the `Transition` helpers for load-on-entry, save-on-exit, and refetch-on-stay navigation policies.
- a25f769: The scaffold `.oxlintrc.json` now extends the `@foldkit/oxlint-plugin` recommended preset instead of hand-listing a subset of foldkit rules, keeping only app-specific config (the core TypeScript rules and `ignorePatterns`) inline. Freshly scaffolded apps get the full foldkit ruleset and can never drift from the preset again, while the preset's own `overrides` keep those rules off in test files.

### Patch Changes

- 519ee57: Rewrite the `File Organization` section of the generated `AGENTS.md` to lead with the runtime-boot invariant (the definitions stay importable from tests because only `entry.ts` calls `Runtime.run`) and to describe when to split a growing app across more files. It now covers the revealed-seam heuristic, the two forced splits, and exemplars from the example apps.

## 0.20.1

### Patch Changes

- 82ae73b: Generate the README's Getting Started commands from the selected package manager instead of always showing pnpm.
- 82ae73b: Scope the generated `lint` script and Vitest config to `src`, and ignore `.claude/worktrees/`. Tooling in a scaffolded project no longer reaches into vendored `repos/` subtrees.

## 0.20.0

### Minor Changes

- 2d23b39: Add `foldkit/no-module-level-mutable-state`, a lint rule that flags module-level `let` and `var` declarations (including `export let`), which hold state outside the Model. Ambient `declare let` declarations are not flagged. Scaffolded projects enable the rule in their generated `.oxlintrc.json`.

  Ported from the purity-boundary rule family in `@mpsuesser/oxlint-plugin-foldkit` by Marc Suesser.

### Patch Changes

- ca64832: Typecheck test files. Each package's `typecheck` script now checks the project that includes tests instead of the build project that excludes them. No runtime changes.

## 0.19.1

### Patch Changes

- aa83f06: Fix scrambled and misplaced dependencies in scaffolded projects.

  Projects built their `package.json` by running two `pnpm add` commands (runtime dependencies, then devDependencies). The second command could non-deterministically move already-installed runtime dependencies into `devDependencies` and overwrite their version specs with unrelated ones, so `effect` and `@effect/platform-browser` sometimes landed in `devDependencies` pinned to a dev tool's version, leaving the generated project un-reinstallable.

  The scaffold now resolves every dependency in code (third-party versions kept as the example declares them, Foldkit packages pinned to the latest published version), writes `dependencies` and `devDependencies` into `package.json` directly, and runs a single install.

## 0.19.0

### Minor Changes

- 1795e0e: Bump bundled Effect dependencies to `4.0.0-beta.88`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.88` exactly during the v4 beta window.

## 0.18.0

### Minor Changes

- 921afa8: Add the charting starter example with ECharts telemetry, website registration,
  and example app coverage.

## 0.17.2

### Patch Changes

- 51c7406: Add the slow warnings, map, and managed resource layer examples to the scaffoldable example choices.

## 0.17.1

### Patch Changes

- 060aebb: Fix pnpm scaffolds to deny the optional `msgpackr-extract` build script so pnpm installs do not fail during project creation.

## 0.17.0

### Minor Changes

- 86b2250: Publish the Foldkit oxlint plugin and scaffold new apps with oxlint and the Foldkit-specific lint rules.

## 0.16.0

### Minor Changes

- fcc7a94: Bump bundled Effect dependencies to `4.0.0-beta.83`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.83` exactly during the v4 beta window.

### Patch Changes

- 32768e5: Raise the declared minimum Node version to 22.22.2. The bundled effect
  dependency pulls in ini, which requires Node ^22.22.2, ^24.15.0, or >=26.0.0,
  so the previous >=22.19.0 declaration understated the real requirement and
  surfaced an EBADENGINE warning when installing on Node 22.19.0.

## 0.15.3

### Patch Changes

- 54ce208: Inline `@foldkit/ui` and `@foldkit/devtools` in the scaffolded app's Vitest config. A scaffolded app installs these as published packages, which Vitest externalizes by default. That loads a second copy of `foldkit` alongside the inlined one, breaking Schema and tag identity in any test that imports from either package. Inlining them keeps a single shared `foldkit` instance, the same reason `foldkit` itself is already inlined.

## 0.15.2

### Patch Changes

- a481ddb: Pin `@foldkit/ui` and `@foldkit/devtools` to `latest` when scaffolding an
  example. These ship from the same monorepo as `foldkit`, so an example that
  depends on them now installs published versions instead of leaking a
  `workspace:` specifier into the generated project.

## 0.15.1

### Patch Changes

- 3a9edc7: Rename colocated test files to name them after their test style: `story.test.ts` for Story tests (which drive `update`) and `scene.test.ts` for Scene tests (which drive the rendered view). The previous `*.story.test.ts` / `*.scene.test.ts` scheme prefixed the file with `main` or `index`, which in split-file apps named neither the update nor the view it tested. `create-foldkit-app`'s scaffolded AGENTS.md now documents the convention. No runtime or public API changes.

## 0.15.0

### Minor Changes

- bd5356d: Add the api-cache example to the scaffolding choices: query caching in the Model with stale-while-revalidate, request deduplication, invalidation, and interval refetching.

## 0.14.0

### Minor Changes

- 1e4a4e6: Add the `embedding` example: a Foldkit widget embedded in a plain TypeScript host page via `Runtime.embed`, with Flags in, typed Ports in both directions, and `dispose` on unmount.

### Patch Changes

- 127e9f5: Update the scaffolded `AGENTS.md` to reference `Runtime.makeApplication` instead of the renamed `Runtime.makeProgram`.

## 0.13.0

### Minor Changes

- 575b2ff: Bump bundled Effect dependencies to `4.0.0-beta.78`. No user-facing changes. Newly scaffolded apps will get the updated pins from the example sources.

  The CLI dependencies now pin `effect`, `@effect/platform-node`, and `@effect/platform-node-shared` to `4.0.0-beta.78` exactly during the v4 beta window.

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
