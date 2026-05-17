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
- Never use `NoOp`. Every message must describe what happened. Fire-and-forget commands use `Completed*` messages mirroring the Command name verb-first: `LockScroll` → `CompletedLockScroll`.

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

Bind the `html` factory inside each view function with `const h = html<Message>()` (never at module level), then reach for `h.div`, `h.OnClick`, etc. off the returned record. Use `empty` (not `null`) for conditional rendering, `M.value().pipe(M.tagsExhaustive({...}))` for discriminated unions, and `Array.match` for lists that may be empty.

Use `keyed` wrappers whenever the view branches into structurally different layouts based on route or model state. Without keying, the virtual DOM tries to diff one layout into another, causing stale DOM and event handler mismatches.

### Commands

Define a Command with `Command.define`, which is curried: the first call binds the name (and optionally args + result Message schemas), and the second call binds the Effect. Assign definitions to PascalCase constants. Never inline in pipe chains. Commands catch all errors via `Effect.catch(() => Effect.succeed(FailedX(...)))` so side effects never crash the app. Definitions live colocated with the update function that returns them.

For the with-args shape, see `repos/foldkit/examples/weather/src/main.ts` or `repos/foldkit/examples/kanban/src/command.ts`. For an argless DOM-side-effect Command, the argless form in `kanban/src/command.ts` (`FocusAddCardInput`) is the canonical reference.

For DOM operations (focus, scroll, modals, scroll lock), Foldkit ships a `Dom` module. For time, randomness, UUIDs, and delays, use Effect's built-ins directly (`Clock`, `Random`, `Effect.uuid`, `Effect.sleep`). Don't reach for raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`.

### File Organization

A Foldkit app lives in two files. `src/main.ts` holds the pure definitions (Model, Messages, init, update, view). `src/entry.ts` imports them and boots the runtime with `Runtime.makeProgram` and `Runtime.run`. `index.html` references `entry.ts`. The split keeps `main.ts` importable from tests without booting a runtime as a side effect. Never call `Runtime.run` from `main.ts`.

Use uppercase section headers (`// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// COMMAND`, `// VIEW`) for wayfinding.

### Testing

Test update functions with `foldkit/test`. Since update is pure, tests run without a runtime, DOM, or side effects. Use `Story.story` for update-level tests (send Messages, assert on Model and Commands) and `Scene.scene` for feature-level testing through the view with accessible locators. If the `repos/foldkit` subtree is available, study the `.story.test.ts` and `.scene.test.ts` files in `repos/foldkit/examples/`.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` instead of `null` or `undefined`. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Always `Array.isEmptyArray` / `Array.isNonEmptyArray` (not `.length === 0`). Use `Array.match` when handling both empty and non-empty cases.
- Never use `for` loops or `let` for iteration. Reach for `Array.map`, `Array.filterMap`, `Array.makeBy`, `Array.reduce`.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Always use `Effect.Match`, never `switch`.
- Always use braces for control flow: `if (foo) { return true }`.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Group all `m()` declarations together with no blank lines between them, then put `S.Union([...])` and `type Message = typeof Message.Type` on adjacent lines:

```ts
const ClickedSubmit = m('ClickedSubmit')
const UpdatedEmail = m('UpdatedEmail', { value: S.String })

const Message = S.Union([ClickedSubmit, UpdatedEmail])
type Message = typeof Message.Type
```

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results), `Completed*` (fire-and-forget), `Got*` (child OutMessage in the Submodel pattern).

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. Reach for them before adding `console.log` whenever the question is about state or Message flow.

## Going Deeper

For Submodels and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.
