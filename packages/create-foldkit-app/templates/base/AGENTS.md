# Agent Development Notes

This is a Foldkit app, a framework built on Effect-TS, architected like Elm.

## Getting the canonical references

The live Foldkit code is the canonical reference for everything: which APIs exist, what idiomatic apps look like, what the current conventions are. Written docs (including this one) can drift; the code can't.

If `./repos/foldkit` exists, it contains the full Foldkit repository, vendored in as a git subtree. Read from it directly:

- `repos/foldkit/examples/`: runnable example apps spanning every complexity tier. Usually your first stop when looking for a precedent for how to write something.
- `repos/foldkit/packages/foldkit/src/`: framework source. Ground truth for API signatures.
- `repos/foldkit/packages/typing-game/client/src/` and `repos/foldkit/packages/website/src/`: production apps built with Foldkit. Highest-fidelity reference for application architecture, Submodels, and OutMessage.

Treat the subtree as read-only reference: never import from `repos/foldkit/` in your project source. Imports must come from the `foldkit` npm package.

If `./repos/foldkit` does not exist and the line below says `subtree_prompted: false`, offer to run `git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash`. This gives you access to the full source, examples, and docs. Whether the user accepts or declines, update the value to `true` so it isn't asked again.

subtree_prompted: false

If `foldkit-skills` is installed as a Claude Code plugin, the `generate-program` and `audit-program` skills carry snapshot architecture and conventions guides synced from the live code.

## Project Conventions

- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Use `m()` for message schemas, `ts()` for tagged structs (model states, field validation), and `r()` for route schemas.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, messages as facts (not commands), model as single source of truth, side effects confined to commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings, flag the issue and propose the idiomatic Foldkit approach.
- Never use `NoOp`. Every message must describe what happened. A command's result message is named from the command, not from the fact it reports, whether or not it carries a payload: `LockScroll` → `CompletedLockScroll`, `DetermineStartTime` → `CompletedDetermineStartTime` (never `DeterminedStartTime`).

## Foldkit Patterns

### Update

`init` and `update` both return `[Model, ReadonlyArray<Command<Message>>]`:

```ts
type UpdateReturn = readonly [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
    }),
  )
```

Use `evo()` from `foldkit/struct` for immutable model updates. Never spread or `Object.assign`.

### View

Every view receives `h`, the typed Html builder, as its last parameter (`view: (model, h) => ...`; `Submodel.defineView` passes the child's own). Never construct a builder; reach for `h.div`, `h.OnClick`, etc. off the parameter, and give extracted view helpers an `h: HtmlBuilder<Message>` last parameter that callers thread through. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih` so the two builders stay distinguishable. Use `h.empty` (not `null`) for conditional rendering, `M.value().pipe(M.tagsExhaustive({...}))` for discriminated unions, and `Array.match` for lists that may be empty.

Keys are for mapped list items only: key each row by a stable Model identifier (`h.keyed('li')(item.id, [], [...])`), never by array position, and never derive a key from displayed data. Never key branches; the build gives each view function's output its own identity, so branch switches replace DOM automatically. When switching an inline same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never `h.div([h.Class('divider')], [])`. The same holds for `keyed`: `h.keyed('li')(key, [attrs])`, never `h.keyed('li')(key, [attrs], [])`. Attributes stay required on element builders, so `h.div([])` is an element with neither. Sibling elements that end up at different arities are expected and fine; void elements like `h.img` have always read that way.

### Commands

Define a Command with `Command.define(name, { args, messages, execute })`; omit `args` when the Command takes none. Assign definitions to PascalCase constants. Never inline in pipe chains. Name the effect `execute` performs, not the later Model transition caused when update handles its result: a timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`. Commands catch all errors via `Effect.catch(() => Effect.succeed(FailedX(...)))` so side effects never crash the app. Definitions live colocated with the update function that returns them.

For the with-args shape, see `repos/foldkit/examples/weather/src/main.ts` or `repos/foldkit/examples/kanban/src/command.ts`. For an argless DOM-side-effect Command, the argless form in `kanban/src/command.ts` (`FocusAddCardInput`) is the canonical reference.

For DOM operations (focus, scroll, modals, scroll lock), Foldkit ships a `Dom` module. For time, randomness, UUIDs, and delays, use Effect's built-ins directly (`Clock`, `Random`, `Effect.uuid`, `Effect.sleep`). Don't reach for raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`.

### File Organization

The invariant: keep the runtime boot separate from the pure definitions. `src/entry.ts` calls `Runtime.makeApplication` and `Runtime.run`, and `index.html` references it. The definitions (Model, Messages, init, update, view, Commands) never call `Runtime.run`, so they stay importable from tests without booting a runtime as a side effect. Never call `Runtime.run` from `main.ts`.

For a small app the definitions all fit in one `src/main.ts`. Split a unit into its own file when it has _both_ a distinct reason to change _and_ a name you'd give it unprompted: the pure domain core into `timer.ts` or `domain.ts`, the view into `view.ts` (or a `components/` directory), a Command's owned resource into its own module. Split on that revealed seam, not on line count alone. A file that has grown large is _evidence_ a seam has formed, so treat its size as a prompt to re-check for one. Two splits are forced: extract Messages to `message.ts` when Commands need the constructors (this breaks the cycle between `command.ts` and `main.ts`), and colocate Commands with the update that returns them. Exemplars: counter and stopwatch are a single `main.ts`; kanban splits `domain` / `command` / `message` / `model`; typing-game splits views by page.

Use uppercase section headers (`// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// COMMAND`, `// VIEW`) for wayfinding.

### Testing

Test update functions with `foldkit/test`. Since update is pure, tests run without a runtime, DOM, or side effects. Use `story` for update-level tests (send Messages, assert on Model and Commands) and `scene` for feature-level testing through the view with accessible locators.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`: `import { Command, given, message, model, story } from 'foldkit/story'`. A test file needs only one of the two modules. If a single file ever tests both, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

Name each test file for its test style, beside the code under test: `story.test.ts` for the Story tests (which drive `update`) and `scene.test.ts` for the Scene tests (which drive the rendered view). The name describes how the test works, not a source file, so it stays correct whether `update` and `view` live in `main.ts` or in their own files. A test file lives in the folder that holds the code it drives, so in a multi-page app most of them sit in a page folder rather than at the root. When one folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`.

Scene runs at any level, since a page's own `update`/`view` pair drops into `scene` unmodified. Put a `scene.test.ts` in the page folder for behavior that page owns, which covers view states awkward to reach through the root Model, and keep a root-level `scene.test.ts` for flows that cross pages, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes. If the `repos/foldkit` subtree is available, study the `story.test.ts` and `scene.test.ts` files in `repos/foldkit/examples/`. `repos/foldkit/examples/auth` is the multi-page shape: a root `src/scene.test.ts` for the cross-page login flow alongside `src/page/loggedOut/page/login.scene.test.ts` and `login.story.test.ts` driving that page's own pair.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` instead of `null` or `undefined`. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Always `Array.isArrayEmpty` / `Array.isArrayNonEmpty` (not `.length === 0` / `.length > 0`). Use `Array.match` when handling both empty and non-empty cases.
- Never use `for` loops or `let` for iteration. Reach for `Array.map`, `Array.filterMap`, `Array.makeBy`, `Array.reduce`.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Always use `Effect.Match`, never `switch`.
- Always use braces for control flow: `if (foo) { return true }`.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Group all `m()` declarations together, then put `S.Union([...])` and `type Message = typeof Message.Type` on adjacent lines:

```ts
const ClickedSubmit = m('ClickedSubmit')
const UpdatedEmail = m('UpdatedEmail', { value: S.String })

const Message = S.Union([ClickedSubmit, UpdatedEmail])
type Message = typeof Message.Type
```

Keep the declarations in one unbroken block while the union is small, up to roughly a dozen Messages. Past that, blank-line thematic clusters (navigation, session, one per feature) are equally fine, so pick whichever reads better for the union at hand. The `S.Union([...])` and `type Message` pair stays adjacent, directly after the declarations, either way.

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results), `Completed*` (every other Command result), `Got*` (child OutMessage in the Submodel pattern).

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. Reach for them before adding `console.log` whenever the question is about state or Message flow.

## Going Deeper

For Submodels and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.
