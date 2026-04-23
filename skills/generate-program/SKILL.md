---
name: generate-program
description: Generate a complete, idiomatic Foldkit program from a natural language description. Use when the user wants to create a new Foldkit program, scaffold a project, or says things like "build me a..." or "I want a program that..."
argument-hint: [description of the program you want]
---

Generate a complete Foldkit program based on this description:

**$ARGUMENTS**

## Phase 1: Analyze the Description

Before writing any code, analyze the description to identify:

1. **Domain entities** — nouns that become Model fields (e.g., "todos", "user", "score")
2. **User interactions** — verbs that become Messages (e.g., "add", "delete", "filter", "submit")
3. **Async operations** — external data that becomes Commands (e.g., "fetch weather", "save to localStorage")
4. **Real-time needs** — streaming data that becomes Subscriptions (e.g., "live updates", "countdown", "WebSocket")
5. **Pages/navigation** — URL structure that becomes routes (e.g., "home page", "detail page")
6. **UI component needs** — interactive widgets that map to Foldkit UI components (e.g., "dropdown" → Menu, "modal" → Dialog, "tabs" → Tabs, "autocomplete" → Combobox, "date picker" → DatePicker, "file upload" → FileDrop, "reorderable list" → DragAndDrop, "toast/notification" → Toast, "hover tooltip" → Tooltip)
7. **Form validation needs** — required fields, format checks, async uniqueness → `foldkit/fieldValidation` module (see Phase 4)
8. **Date handling** — birthdays, deadlines, scheduling → `Calendar` module + `Ui.DatePicker` or `Ui.Calendar`
9. **File handling** — uploads, attachments, images → `File` module + `Ui.FileDrop`

Present this analysis to the user before proceeding.

If the description is detailed and unambiguous, summarize the analysis and confirm before moving on. But if there are gaps — unclear state transitions, vague UI requirements, unspecified error handling, missing edge cases, ambiguous domain boundaries, unclear counter/reset semantics — ask targeted clarifying questions before proceeding. Don't ask open-ended questions like "anything else?" — ask specific questions about the gaps you found.

**UX/behavior gaps:**

- "Should the todo list persist across page reloads (localStorage), or start fresh each session?"
- "When the API call fails, should the app show an inline error or a dialog?"
- "You mentioned 'users can edit items' — is that inline editing or a separate edit page?"

**Domain-logic gaps — easy to miss, expensive to fix:**

- "When the user skips an interval, does that count as 'completed' for purposes of the streak?"
- "Does a counter that tracks 'completed' increments on successful actions only, or on skipped actions too?"
- "If the user triggers a reset mid-flow, does the counter reset with it, or persist across resets?"
- "You mentioned 'after N events, trigger X' — is that N events total, or N events since the last X?"
- "On the Nth action in a cycle, which action does it trigger — the cycle's first or last?"

Domain-logic questions often surface off-by-one bugs before they hit the code. If the description has any counter, cycle, streak, or "after N" phrase, ask about edge cases at 0 and 1 and N specifically.

The goal is to resolve ambiguity early so the generated code matches what the user actually wants, not what you assumed.

## Phase 2: Study Reference Examples

Read the architecture and conventions guides to internalize the rules:

- [Architecture guide](architecture.md) — TEA structure, file organization, type patterns
- [Conventions guide](conventions.md) — naming, Effect-TS patterns, anti-patterns
- [Verification checklist](checklist.md) — not just for Phase 5, also the generation bar. Skim the **Quality Bar** section now so you generate code that already meets it rather than code that will fail review.

If you have access to a context7 MCP tool, use it to look up Effect-TS documentation when you're unsure about an API. Effect is a large library — verify function signatures rather than guessing.

### Quality exemplars

Two codebases are the _quality bar_ for generated apps — not just "patterns to copy" but "the level of craft to match":

- `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/` — production multi-page app: Submodels, OutMessage, update/view decomposition, curried handler extraction, subscription patterns, domain modules.
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/` — production Foldkit website: page organization, shared view primitives, route-driven rendering, idiomatic domain separation.

Before generating, spot-check at least ONE file from each — the shape of `update.ts` / how handlers get extracted / how domain files are structured — and match that level of craft in your output. The generated code should be indistinguishable from hand-written exemplar code.

Then read the tier-specific example files that match the app's complexity. **Always read at least one tier-specific example** — never generate from memory alone.

### Complexity tiers

**Tier 1 — Single page, no async, minimal state:**
Read `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`

**Tier 2 — Timers, subscriptions, simple stateful apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/main.ts` (timer via subscription, `Duration` field pattern) and `${CLAUDE_SKILL_DIR}/../../examples/todo/src/main.ts` (CRUD with localStorage via flags)

**Tier 3 — Async operations, loading/error states, API calls, form validation:**
Read `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts` (HTTP with `HttpClient`) and `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts` (uses `foldkit/fieldValidation` — see the Form Validation section in Phase 4)

**Tier 4 — URL routing, multiple pages, query parameters:**
Read `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts` and `${CLAUDE_SKILL_DIR}/../../examples/query-sync/src/main.ts`

**Tier 5 — Complex state, nested domain models, CRUD, drag-and-drop:**
Read `${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/main.ts` (nested domain schemas, cart state) and `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/main.ts` (CRUD with `Ui.DragAndDrop`, flags restoring from localStorage, subscriptions)

**Tier 6 — Submodels, OutMessage, multi-step forms, auth flows, multi-module apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/auth/src/main.ts` (login/signup with Submodels, OutMessage, protected routes) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/main.ts` (multi-step form with deeply nested Submodels in `step/`, `Ui.DatePicker`, `Ui.FileDrop`, `Ui.Menu`, `Calendar` module for date handling)

**Tier 7 — Real-time, WebSocket, managed resources, production-grade:**
Read `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/main.ts`, then explore its `page/home/` and `page/room/` directories for the full Submodel/OutMessage pattern.

Read examples from the target tier AND all lower tiers. A Tier 4 app should reflect patterns from Tiers 1-3 as well.

## Phase 2.5: Identify Foldkit UI Component Opportunities

Foldkit ships accessible UI components that handle keyboard navigation, ARIA attributes, and focus management automatically. Before generating, check if any part of the app maps to a built-in component:

| User Need                       | Foldkit Component | What you get for free                                           |
| ------------------------------- | ----------------- | --------------------------------------------------------------- |
| Modal/dialog/confirmation       | `Dialog`          | Focus trapping, Escape to close, scroll locking, backdrop       |
| Tabbed content                  | `Tabs`            | Arrow key navigation, aria-selected, roving tabindex            |
| Dropdown menu                   | `Menu`            | Arrow keys, typeahead search, aria-expanded, click-outside      |
| Autocomplete/tag input          | `Combobox`        | Filtering, arrow key selection, aria-activedescendant           |
| Select dropdown                 | `Select`          | Keyboard selection, aria-selected, positioning                  |
| Single selection from options   | `RadioGroup`      | Arrow key cycling, aria-checked                                 |
| On/off toggle                   | `Switch`          | Spacebar toggle, aria-checked                                   |
| Boolean option                  | `Checkbox`        | Spacebar toggle, aria-checked, indeterminate                    |
| Expandable section              | `Disclosure`      | Enter/Space toggle, aria-expanded                               |
| Floating content on hover/click | `Popover`         | Positioning, click-outside, focus management                    |
| Hover tooltip                   | `Tooltip`         | Show-delay, keyboard dismiss, positioning, aria-describedby     |
| Single-select list              | `Listbox`         | Arrow keys, typeahead, aria-selected                            |
| Text input                      | `Input`           | Consistent styling/behavior wrapper                             |
| Multi-line text                 | `Textarea`        | Auto-resize, consistent styling                                 |
| Form group                      | `Fieldset`        | Disabled state propagation, grouping                            |
| Styled button                   | `Button`          | Consistent click/keyboard handling                              |
| Inline calendar grid            | `Calendar`        | Month navigation, keyboard nav, aria-selected, date constraints |
| Date input + popover            | `DatePicker`      | Calendar popover, input masking, keyboard nav, constraints      |
| File upload zone                | `FileDrop`        | Drag-and-drop, click-to-browse, accept filters, validation      |
| Reorderable list                | `DragAndDrop`     | Pointer + keyboard drag, drop zones, announcement region        |
| Transient notifications         | `Toast`           | Auto-dismiss, pause-on-hover, stacking, role=status/alert       |

Each component is a Foldkit Submodel with its own Model, Message, init, update, and view. To use one:

1. Add its Model to your Model: `confirmDialog: Ui.Dialog.Model`
2. Add a `Got*` Message: `GotConfirmDialogMessage` with `{ message: Ui.Dialog.Message }`
3. Initialize in init: `confirmDialog: Ui.Dialog.init({ id: 'confirm-dialog' })`
4. Delegate in update: `GotConfirmDialogMessage: ({ message }) => ...`
5. Render in view: `Ui.Dialog.view(model.confirmDialog, ...)`

**Always prefer Foldkit UI components over hand-rolling interactive widgets.** They make accessibility the default, not an afterthought.

**For form inputs specifically:** every text input, textarea, and button in a form MUST use `Ui.Input`, `Ui.Textarea`, and `Ui.Button` respectively — this is not optional, even though raw `input`/`textarea` HTML elements are available from `html<Message>()`. The form example (`examples/form/src/main.ts:347-403`) defines `inputFieldView` and `textareaFieldView` helpers that wrap `Ui.Input.view` and `Ui.Textarea.view` with label + validation feedback. Copy that helper pattern. Raw `input`/`textarea` are for non-form cases (search fields, inline editors) where you're intentionally working below the Ui component layer, and even then, reach for the Ui component first.

If the app uses UI components, **always read the ui-showcase example first** to understand how components are wired — this is the canonical reference for Foldkit UI integration patterns:

- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/main.ts` — root wiring, `Got*` delegation, `toParentMessage` helpers
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/message.ts` — how UI component Messages are structured
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/model.ts` — how UI component Models are composed
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/update.ts` — how UI component updates are delegated
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/toast.ts` — read when using `Ui.Toast`: Toast is unique in that it's parameterized on a payload schema via `Ui.Toast.make(PayloadSchema)`, returning a typed module you import from

For apps using `Ui.DatePicker`, `Ui.FileDrop`, or other recently-added components, also read the `job-application` example (see Tier 6 below) — it's the most complete real-world integration of these components together.

## Phase 3: Determine File Organization

Match the file structure to the app's complexity. The architecture stays the same at every scale — only the file organization changes.

**Single file** (Tier 1-2, under ~300 lines):

```
src/main.ts          ← Model, Message, init, update, view all inline
```

**Split commands + messages** (Tier 3, has async operations):

```
src/main.ts          ← Model, init, update, view
src/message.ts       ← Message definitions
src/command.ts       ← Command functions
```

**Important rule:** if you extract `command.ts`, you MUST also extract `message.ts`. Commands reference Message constructors (e.g. `SucceededFetchWeather({...})`) as their Effect return values. If Messages live in `main.ts` and Commands live in `command.ts`, `command.ts` imports from `main.ts` _and_ `main.ts` uses Commands from `command.ts` — a circular import. Pull Messages out first, then both `main.ts` and `command.ts` import from `message.ts`.

**Full split** (Tier 4-5, multiple concerns):

```
src/main.ts          ← init, update, view, app entry
src/model.ts         ← Model schema
src/message.ts       ← Message definitions
src/command.ts       ← Command functions
src/route.ts         ← Route parser (if routing)
src/view.ts          ← View functions (if view is large)
src/domain/          ← Shared domain schemas (if multiple entities)
```

**Submodel directories** (Tier 6-7, independent modules):

```
src/main.ts          ← Root init, update, view
src/model.ts         ← Root model (contains submodels)
src/message.ts       ← Root messages + Got* bridging
src/command.ts       ← Shared commands
src/route.ts         ← Route parser
src/domain/          ← Shared domain schemas
src/page/
  featureA/
    main.ts          ← Submodel init, update, view
    message.ts       ← Submodel messages + OutMessage
    command.ts       ← Submodel commands
  featureB/
    ...
```

## Phase 3.3: Architecture sketch (Tier 4+ only)

For Tier 4+ apps — routing, domain modules, multiple entities, submodels — produce a compact sketch BEFORE generating implementations. Tier 1-3 apps are small enough to generate in one pass; Tier 4+ apps burn a lot of effort if the structure is wrong.

The sketch has five parts. Emit them inline in the conversation, get confirmation, THEN scaffold:

1. **File tree** — the exact paths you will create. Match Phase 3's organization.
2. **Model shape** — the top-level `S.Struct` fields and their types. Not the full schema, just the shape.
3. **Message list** — every Message you plan to define, grouped by category (clicks, inputs, commands, out-messages).
4. **Route list** — if routing, every `r('...', {...})` with params and the path each maps to.
5. **Domain operations** — for each file in `domain/`, the operations it will expose (`Link.byNewest`, `Link.filterByTag`, etc.).

Example for a Tier 4 link saver:

```
### Sketch

Files:
  src/main.ts, model.ts, message.ts, command.ts, route.ts
  src/domain/link.ts, index.ts
  src/main.story.test.ts, main.scene.test.ts

Model:
  route: AppRoute
  links: ReadonlyArray<Link>
  newLinkForm: NewLinkForm (url: Field, title/description/tagsInput: string, submitState)

Messages:
  Clicks: ClickedSaveLink, ClickedDeleteLink
  Inputs: UpdatedLinkUrl, UpdatedLinkTitle, UpdatedLinkDescription, UpdatedLinkTagsInput, BlurredLinkUrl
  Commands: SubmittedNewLinkForm, SucceededSaveLinks, FailedSaveLinks
  Routing: ClickedLink, ChangedUrl, CompletedNavigateInternal, CompletedLoadExternal
  Toggles: ToggledFavorite

Routes:
  HomeRoute         → /
  NewLinkRoute      → /new
  TagFilterRoute    → /tag/:tag
  NotFoundRoute     → /* fallback

Domain:
  Link: schema + byNewest, filterByTag, toggleFavorite, remove, updateById
```

After emitting the sketch, ask the user to confirm or adjust. Don't start scaffolding or generation until they do. If the user confirms silently (e.g. "looks good, continue"), proceed. If they adjust, iterate on the sketch — don't write code against a version they haven't approved.

This step is frequently tempting to skip because the agent "knows what it's doing." Skip it and you ship a fully-generated app that turns out to need structural changes — that's the expensive form of iteration. The sketch is the cheap form.

## Phase 3.5: Scaffold the Project

Before generating code, scaffold a runnable project using `create-foldkit-app`:

```bash
npx create-foldkit-app@latest --wizard
```

Use the wizard to select the counter example as the base (simplest starting point) and the user's preferred package manager. The generated project includes:

- `package.json` with all Foldkit and Effect dependencies
- `vite.config.ts` with Tailwind and the Foldkit Vite plugin
- `tsconfig.json` with strict TypeScript settings
- `index.html` with the root container
- `src/styles.css` with Tailwind import
- `AGENTS.md` with Foldkit conventions

### Offer the Foldkit submodule

After scaffolding, offer to add Foldkit as a git submodule so future AI sessions can reference the full source, examples, and docs directly from the user's project:

```bash
git init          # if not already a git repo
git submodule add https://github.com/foldkit/foldkit.git repos/foldkit
```

This is optional but strongly recommended. The scaffolded `AGENTS.md` includes a `submodule_prompted: false` line that agents check on future sessions — if the submodule is absent and this flag is false, the agent offers to add it. Handling it up front here means the user's next AI session already has full context. If the user declines, update the line to `submodule_prompted: true` so they aren't asked again.

To refresh the submodule later: `git submodule update --remote repos/foldkit`.

### Replace the scaffold

Then replace the counter example code in `src/main.ts` (and add additional source files as needed) with the generated app code.

## Phase 3.7: Ground the Foldkit APIs

Before writing any code, READ the type signatures of every Foldkit module you will use. Guessing signatures wastes cycles: each wrong guess is a tsc error, a re-read, an edit, another typecheck. Five minutes of reading prevents thirty minutes of iteration.

### The exact files to read

For each Foldkit module you plan to use, read the `.d.ts` at the paths below. Read the public surface; you don't need the internals. Write a short signature crib in your working notes so you don't have to re-check while generating.

```
# Every app
<project>/node_modules/foldkit/dist/index.d.ts          # top-level re-exports
<project>/node_modules/foldkit/dist/html/index.d.ts     # html<M>(), element signatures, Attribute<M>, empty, keyed
<project>/node_modules/foldkit/dist/message/index.d.ts  # m()
<project>/node_modules/foldkit/dist/schema/index.d.ts   # ts(), r()
<project>/node_modules/foldkit/dist/struct/index.d.ts   # evo() — check nested-update signature
<project>/node_modules/foldkit/dist/runtime/runtime.d.ts # ProgramInit, RoutingProgramInit, makeProgram

# If using routing
<project>/node_modules/foldkit/dist/route/parser.d.ts   # literal, slash, string, int, Route.root, Route.mapTo, Route.oneOf, Route.parseUrlWithFallback
<project>/node_modules/foldkit/dist/url/index.d.ts      # toString
<project>/node_modules/foldkit/dist/navigation/index.d.ts # pushUrl, load — all return Effect<void> (no Effect.ignore needed)

# If using async / side effects
<project>/node_modules/foldkit/dist/command/index.d.ts  # Command.define — result schemas are required
<project>/node_modules/foldkit/dist/task/index.d.ts     # focus, uuid, getTime (returns DateTime.Utc, not number), delay, scrollIntoView, showModal

# If using subscriptions
<project>/node_modules/foldkit/dist/subscription/index.d.ts # Subscription.makeSubscriptions(Deps)<Model, Message>

# If using forms
<project>/node_modules/foldkit/dist/fieldValidation/public.d.ts # Field (tagged union), makeRules({required?, rules: Rule[]}), validate, url(options), email, minLength, allValid
# Rule is [Predicate, RuleMessage], NOT {test, message}. Field.Invalid has `errors: NonEmptyArray<RuleMessage>`, not `error: string`.

# If using any UI component
<project>/node_modules/foldkit/dist/ui/<component>/public.d.ts  # Model, Message, init, update, view, ViewConfig
# Check: does ViewConfig have the props you need? Does toView destructure label/input/description/button attribute groups?

# If using dates
<project>/node_modules/foldkit/dist/calendar/index.d.ts # CalendarDate, today.local (returns DateTime, use Clock.currentTimeMillis for raw millis)
```

### What to record in the crib

For each symbol you'll call, write one line:

```
html<M>(): { div, input (VOID), textarea, button, Class, Href, For, Id, Role, OnClick(M), OnInput(value=>M), OnBlur(M), OnSubmit(M), keyed, empty, ... }
Route.mapTo(schema)(parser) — curried
pushUrl(path): Effect<void>  // NOT fallible, no Effect.ignore needed
urlToString(url: Url): string
Ui.Input.view({ id, value, onInput, isInvalid?, type?, placeholder?, toView: (attrs) => Html })
  // attrs: { label: Attribute<M>[], input: Attribute<M>[], description: Attribute<M>[] }
Field (schema): NotValidated | Validating | Valid | Invalid(errors: NonEmpty<Rule Message>)
```

### Specific API pitfalls the generator hits repeatedly

Record these in the crib and keep them visible while generating:

- **`input` and `br` and other void elements take ONLY attributes** — `input([...])`, never `input([...], [])`. `textarea` and `button` DO take children.
- **`UrlRequest` tags are `Internal` and `External`**, not `InternalUrl` / `ExternalUrl`.
- **`OnClick` and `OnSubmit` take a Message directly**, not a `() => Message`. Only `OnInput` takes `(value) => Message` because it needs the input value.
- **`keyed`, `empty` are destructured from `html<M>()`** — not top-level exports of `foldkit/html`.
- **Attribute helpers are specific** — `Value(...)`, `Type(...)`, `Placeholder(...)`, `Href(...)`, `Target(...)`, `Rel(...)`, `Rows(n)`, `Id(...)`, `For(...)`, `Role(...)`, `AriaLabel(...)`. There is no generic `Attr('...', '...')`.
- **`ProgramInit<Model, Message, Flags>` has no URL parameter.** For routed apps, use `RoutingProgramInit<Model, Message, Flags>` — the second arg is `url: Url`.
- **`Route.mapTo` takes the route schema, not a factory function.** `pipe(literal('new'), Route.mapTo(NewLinkRoute))` — NOT `Route.mapTo(() => NewLinkRoute())`.
- **`Effect.ignore` is ONLY for fallible Effects.** `pushUrl(path).pipe(Effect.as(Message()))` — no `Effect.ignore` because `pushUrl` returns `Effect<void>`.
- **`Command.define` requires result Message schemas after the name**: `Command.define('Fetch', SucceededFetch, FailedFetch)`. Infallible Commands only need one result: `Command.define('ReadClock', RecordedTime)`.
- **`makeRules` takes `{ required?: RuleMessage, rules: Rule[] }` where `Rule = [Predicate, RuleMessage]`** — a tuple, NOT `{ test, message }`. Use the built-in rule constructors (`url({ message })`, `email(message?)`, `minLength(n, message?)`, `pattern(regex, message?)`).
- **`Field.Invalid` has `errors: NonEmptyArray<RuleMessage>`, not `error: string`.** Use `Array.headNonEmpty(errors)` to get the first message; use `resolveMessage(rule, value)` to get the final string.
- **Route variants are `HomeRoute`, `NewLinkRoute`, etc. — with the `Route` suffix.** Every exemplar uses this convention.
- **Routers are callable for printing**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. Never hand-construct URLs.

## Phase 4: Generate the App

Generate files following the architecture and conventions guides exactly. Write all source files into the scaffolded project's `src/` directory. For each file, follow these rules:

### Model

- Define as `S.Struct` with Effect Schema types
- Use discriminated unions for state: `Idle | Loading | Error | Ok`, never booleans for multi-valued state
- Use `Option` for fields that may be absent — never empty strings or null
- Prefix Option-typed fields with `maybe`: `maybeCurrentUser`, `maybeError`
- For async data, define `Idle`, `Loading`, `Error`, `Ok` variants with `ts()` and compose into an `S.Union` — see Discriminated Unions for State in [conventions.md](conventions.md)
- For apps with multiple domain entities referenced across modules, extract shared schemas into `src/domain/` (e.g., `domain/product.ts`, `domain/session.ts`). See the shopping-cart and auth examples for this pattern, and read `${CLAUDE_SKILL_DIR}/../../packages/website/src/page/projectOrganization.ts` for guidance on when and how to structure domain modules

### Messages

Follow the four-group layout strictly:

```ts
// Group 1: All m() declarations, no blank lines between them
const ClickedSubmit = m('ClickedSubmit')
const UpdatedEmail = m('UpdatedEmail', { value: S.String })
const SucceededLogin = m('SucceededLogin', { user: User })
const FailedLogin = m('FailedLogin', { error: S.String })
const CompletedFocusInput = m('CompletedFocusInput')

// Group 2: Union + type (no blank line between them)
const Message = S.Union(
  ClickedSubmit,
  UpdatedEmail,
  SucceededLogin,
  FailedLogin,
  CompletedFocusInput,
)
type Message = typeof Message.Type
```

Name messages by category:

- `Clicked*` — button/link clicks
- `Updated*` — input value changes (with `{ value: S.String }`) and external state updates from subscriptions (`UpdatedRoom`, `UpdatedPlayerProgress`)
- `Submitted*` — form submissions
- `Succeeded*` / `Failed*` — paired, for commands that can meaningfully fail
- `Completed*` — fire-and-forget (verb+object: `CompletedFocusInput`)
- `Got*` — child module results via OutMessage pattern
- `Loaded*` — data restored from storage
- `Pressed*` — keyboard input
- `Blurred*` — focus loss
- `Selected*` — choice made from a list
- `Toggled*` — binary state flip

Every message must carry meaning. No `NoOp`.

### Flags (if the initial Model needs side effects)

- Define a `Flags` Schema for data the initial Model needs from side effects
- Define `flags` as an `Effect<Flags>` that computes the values (localStorage reads, current time, etc.)
- Pass the result into init — never perform side effects at module level or inside init directly
- See the flags section in [architecture.md](architecture.md) for the full pattern

### Init

- Return `[Model, ReadonlyArray<Command<Message>>]`
- If flags are used, accept them as the first parameter: `(flags: Flags) => [Model, Commands]` or `(flags: Flags, url: Url) => [Model, Commands]`
- Include startup Commands (initial fetch, focus first input, etc.)
- Use callable Schema constructors for the initial Model: `Model({ field: value })`

### Update

- Use `M.value(message).pipe(withUpdateReturn, M.tagsExhaustive({...}))` — never switch
- Every case returns `[Model, ReadonlyArray<Command<Message>>]`
- Use `evo(model, { field: () => newValue })` for immutable updates
- Extract complex handlers to separate functions when a case exceeds ~15 lines
- For Submodels: return `[Model, ReadonlyArray<Command<Message>>, Option.Option<OutMessage>]`
- See the OutMessage pattern in [architecture.md](architecture.md) — child modules signal to parents via `Option.some(OutMessage)`, parents handle with `Got*` Messages and `M.tagsExhaustive`

### Commands

- Define Command identities with `Command.define`, passing result Message schemas after the name — result types are required
- Always assign definitions to PascalCase constants — never inline in pipe chains
- Definitions live where they're produced, colocated with the update function
- Let TypeScript infer return types — no explicit `Command<typeof A>` annotations
- Use `Effect.gen` for multi-step async
- Always `Effect.catchAll(() => Effect.succeed(FailedX(...)))` for fallible Effects — Commands never throw. **Exception:** if the Effect is infallible at the type level (`Clock.currentTimeMillis`, `Task.getTime`, `Task.randomInt`, `Task.uuid`, etc.), no `catchAll` is needed and no `Failed*` Message is needed. Follow the types — if there's no error channel, there's nothing to catch.
- Use `Effect.provide` for services
- Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- Fire-and-forget Commands return `Completed*` Messages
- Use `Task` helpers for DOM operations (`Task.focus`, `Task.scrollIntoView`, `Task.showModal`, `Task.delay`, `Task.uuid`, etc.) — see Task Helpers in [architecture.md](architecture.md)
- For HTTP requests, use `HttpClient` from `@effect/platform` — see the weather example for the pattern

### Form Validation

When the app has form inputs that need validation (required fields, format checks, async uniqueness checks), use `foldkit/fieldValidation` — do not hand-roll validation state.

```ts
import {
  Field,
  Invalid,
  NotValidated,
  Valid,
  Validating,
  allValid,
  email,
  makeRules,
  minLength,
  validate,
} from 'foldkit/fieldValidation'

const nameRules = makeRules({
  rules: [minLength(2, 'Name must be at least 2 characters')],
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [email('Please enter a valid email address')],
})

const Model = S.Struct({
  name: Field,
  email: Field,
  // ...
})
```

The `Field` schema is a tagged union: `NotValidated | Validating | Valid | Invalid`. Use `validate(rules, value)` in update handlers to transition a field, `allValid(fields)` to gate submission, and `FieldValidation.optional(rules)` to build optional-field rule sets.

Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts` (async email uniqueness check with version-based cancellation) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/` (validated multi-step forms across submodels).

### Dates and File Uploads

For date handling (birthday, deadlines, scheduling):

- Use the `Calendar` module: `Calendar.CalendarDate`, `Calendar.today.local` (Effect returning today's date in the user's timezone), `Calendar.make(year, month, day)`, `Calendar.addDays`, etc.
- Use `Ui.DatePicker` (input + popover calendar) or `Ui.Calendar` (inline grid) for the UI
- Seed the initial date via flags when needed — see `job-application` example, which uses `Calendar.today.local` in its flags Effect

For file uploads (resumes, images, attachments):

- Use the `File` module for file primitives
- Use `Ui.FileDrop` for a drag-and-drop + click-to-browse zone with validation
- `Ui.FileDrop.ReceivedFiles` is a `NonEmptyArray<File>` OutMessage — empty selections never fire
- Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/attachments.ts`

### View

- Destructure html elements: `const { div, span, button, input } = html<Message>()`
- Use `Class(...)` for Tailwind classes
- Use `clsx` from the `clsx` package for conditional class composition: `Class(clsx('base-classes', { 'active-class': isActive, 'bg-blue-500': variant === 'Primary' }))`. Use `clsx` whenever classes depend on model state, boolean flags, or discriminated union tags — never string concatenation, template literals, or `&&` expressions
- Pattern match on model state: `M.value(model.state).pipe(M.tagsExhaustive({...}))`
- Use `Option.match` for conditional rendering based on Option fields
- Use `keyed('div')(routeOrStateTag, attrs, children)` on layout branches
- Delegate complex sections to extracted view functions
- Wire events to messages: `OnClick(() => ClickedSubmit())`, `OnInput(value => UpdatedEmail({ value }))`
- Use Foldkit UI components when the interaction matches (Dialog for modals, Tabs for tabbed content, etc.)

### Runtime Wiring

- Use `Runtime.makeProgram` — add `routing: { onUrlRequest, onUrlChange }` for apps with URL routing
- Add `title: model => ...` to set `document.title` after every render — derive from route or any model state
- See the With and Without URL Routing section in [architecture.md](architecture.md) for the full pattern
- Include `ClickedLink` and `ChangedUrl` Messages for programs with routing, with proper `InternalUrl`/`ExternalUrl` handling in update
- Always end with `Runtime.run(program)`

### Routes (if multi-page)

- Use bidirectional parser: `r()`, `string()`, `int()`, `literal()`, `slash()`, `Route.mapTo()`, `Route.oneOf()`
- Define route schemas with `r('RouteName', { param: S.String })`
- **Suffix route variant constants with `Route`**: `HomeRoute`, `NewLinkRoute`, `NotFoundRoute`. Every exemplar (auth, shopping-cart, routing) does this. Disambiguates the route schema from views, models, or UI components with matching tag names.
- Build each route as a Router: `const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))`. **Routers are callable** — `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. This is the print side of the bidirectional parser.
- **Never hand-construct paths with template strings.** `Href(homeRouter())` not `Href('/')`. `navigateInternal(newLinkRouter())` not `navigateInternal('/new')`. `Href(tagFilterRouter({ tag: tagName }))` not ``Href(`/tag/${encodeURIComponent(tagName)}`)``. The router handles encoding and keeps the URL shape in one place so a refactor changes one file, not every call site.
- Key view content on `model.route._tag`
- Use `pushUrl` from `foldkit/navigation` in Commands for programmatic navigation. In the `ClickedLink` handler's `Internal` case, use `urlToString(url)` from `foldkit/url` — never reconstruct the URL from `url.pathname + search + hash` manually, that path drops the `?` prefix and hash silently.
- In the `ClickedLink` handler, **don't pre-update `model.route`**. The runtime fires `ChangedUrl` after `pushUrl` resolves, which updates the route. Pre-updating creates a double-write.

### Subscriptions (if real-time)

- Define with `Subscription.makeSubscriptions(Deps)<Model, Message>`
- `modelToDependencies` extracts Subscription parameters from Model
- `dependenciesToStream` builds `Stream<Message>` from dependencies
- Subscriptions auto-start/stop based on Model state — never manually managed
- For Subscriptions with no Model dependencies (always active), use `S.Null` as the dependency type and return `null` from `modelToDependencies`

## Phase 4.5: Self-check before verification

Before running `tsc` or opening the browser, do a quick mechanical pass over the generated files. The reviewer in Phase 6 catches these, but catching them at write-time is cheaper than catching them after a full review round. Skip this and you inflate round-1 review noise with preventable items.

**Run the "Mechanical scans" block in `checklist.md`** against `src/`. That's the canonical list of greps — it covers empty-object constructors, hard-coded route paths, hand-rolled form inputs, `.length > 0` checks, raw spread in `evo`, `as` casts on constructor returns, unpaired labels, `maybe*` on non-Option, `span([], [])` placeholders, redundant `Effect.ignore`, and focus-outline resets. Each hit is either a fix or a `// NOTE:` justification.

Then eyeball each file you wrote:

- **Every file's imports**: do you actually use every symbol? (Lint catches this, but catching it here avoids a lint round later.)
- **Every Message in the Union**: does update have a case for it? Does the view dispatch it?
- **Every state variant**: is it ever entered? Does the view render something different when it's active?
- **Every Command**: is it tested? Does its `Succeeded*` or `Completed*` Message have a handler in update?

This is ~2 minutes of reading per file. It saves ~15 minutes of review loop per unresolved item.

## Phase 5: Verify and Test

### Gate: three commands must succeed before declaring Phase 5 complete

Before moving to Phase 6, run ALL THREE of these and fix everything they surface. Not one, not two — all three:

```bash
npm run lint        # or: npx eslint .
npm run typecheck   # or: npx tsc --noEmit
npm run test        # or: npx vitest run
```

Each catches different classes of issue:

- **Lint** catches unused imports, unused variables, and style-rule violations. Easy to miss because generated code often imports a symbol "for completeness" that turns out not to be referenced (e.g. importing `NotValidated`, `Invalid` from fieldValidation when they're only used as string literals inside `M.tag` keys). `tsc` doesn't flag these.
- **Typecheck** catches API misuse, wrong parameter shapes, missing required props, and structural type errors. Doesn't catch unused imports.
- **Tests** catch behavioral regressions. Don't catch either of the above.

If the project doesn't have a lint script, check `package.json` for eslint config and run `npx eslint .` directly. Don't skip lint because "there's no script" — the scaffolded `create-foldkit-app` project always ships eslint configured.

Fix ALL output from all three before declaring Phase 5 done. "Typecheck clean and tests pass" is insufficient — a codebase with unused imports is not at the bar.

### Type errors first

Then generate tests using `foldkit/test`. There are two test styles:

**Story tests** (`main.story.test.ts`) test the update function directly — you send Messages and assert on the Model and Commands. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.test.ts` — simple Command resolution (happy path + error path)
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/page/login.test.ts` — Submodel with OutMessage assertions, field validation
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/search/update.test.ts` — multi-step interactions (arrow key cycling, stale result handling)

Write `Story.story` pipelines covering:

- **Happy path** — the primary user flow from start to finish
- **Error path** — every fallible Command resolved with its `Failed*` Message
- **Multi-step interaction** — at least one test that chains multiple Messages and Command resolutions
- **Edge cases** — empty states, boundary conditions, ignored inputs (e.g. stale results, duplicate submissions)

**Scene tests** (`main.scene.test.ts`) test through the rendered view — you interact with elements by accessible locators (role, label, text) and assert on what the user sees. A `main.scene.test.ts` is **REQUIRED** for Tier 3+ apps. The review loop treats its absence as a BLOCKER, not a QUALITY item. No exceptions — don't "defer" this. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.scene.test.ts` — basic Scene flow with form interaction and Command resolution
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/page/login.scene.test.ts` — Submodel Scene testing, field validation through the view
- `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/main.scene.test.ts` — scoped queries with `within`, `toHaveValue`, explicit test data

Write `Scene.scene` pipelines covering:

- **View rendering** — initial view has expected elements (headings, inputs, buttons)
- **User interactions** — click, type, submit produce visible changes
- **Loading states** — submitting shows loading indicator
- **Error states** — failed Commands show error messages in the view
- **Scoped queries** — use `Scene.within(parent, child)` to compose a single scoped Locator (good for one-off scoped assertions or reusable named locators). Use `Scene.inside(parent, ...steps)` to scope a whole block of steps to the same parent — every Locator referenced by the nested steps resolves within the parent's subtree. Reach for `inside` when two or more steps share a scope; reach for `within` for single-use scoping.
- Prefer accessible locators: `Scene.label(...)`, `Scene.role(...)`, `Scene.text(...)` over `Scene.placeholder(...)` or CSS selectors

Run `npx vitest run` to verify tests pass.

Then run through the [verification checklist](checklist.md) to catch structural gaps. Fix any remaining issues before moving on.

## Phase 5.5: Visual and a11y verification

Code review and automated tests don't catch rendering bugs or accessibility gaps. Two things to do before Phase 6:

### Visual check

Start the dev server (`npm run dev`) and open the app in a browser. Click through every route. Interact with every form. Watch for:

- Inputs with missing backgrounds (Tailwind preflight strips the browser-default white — `bg-white` must be explicit on every `input`/`textarea` you don't route through `Ui.Input`)
- Text that's too dim or too small to read
- Overlapping elements, broken spacing, layout shifts
- Cursor/hover states that don't feel right
- Focus rings that are invisible or missing on interactive elements

Many visual bugs are invisible to typecheck, tests, and code review. The only tools that catch them are (1) looking at the rendered output and (2) using `Ui.*` components that already bake sensible defaults in.

If the app has UI, **don't claim Phase 5 complete until you've loaded the app and clicked through it.** If you can't run a browser in your environment, say so explicitly in the final report rather than skipping the check silently.

### A11y check

Walk the **Accessibility** and **Foldkit UI** sections of `checklist.md`. Both have mechanical grep commands — run them against `src/`. Don't re-list them here; the checklist is the canonical reference for these greps, and duplicating them across files invites drift.

A11y items are not "nice-to-have" — they're correctness for a non-visual user.

## Phase 6: Subagent Review Loop

Self-review is weaker than fresh-eyes review. After Phase 5 passes, spin up subagents to review the generated code against the quality bar — and iterate until they sign off.

### Loop mechanics

Run up to **three rounds**. Each round:

1. Spawn a review subagent using the `Agent` tool with `subagent_type: general-purpose`.
2. Read the subagent's response.
3. If response is `PASS`, exit the loop — proceed to Phase 7.
4. If response contains `BLOCKERS` or `QUALITY` items, fix each, then loop.
5. `NICE-TO-HAVE` items can be deferred to Phase 7's future-work list if the round budget is exhausted.

After round 3, if issues remain, exit the loop and carry the unresolved items into Phase 7 as "known polish areas" — do not silently ship flagged code. Be explicit about what's still open.

### Review subagent prompt

Use a prompt of roughly this shape. Tailor only the file list and project path — keep the rubric, output format, blind-spots checklist, and bar-setting instructions intact.

```
You are reviewing a freshly generated Foldkit program. The bar is:
this code should be indistinguishable in quality from hand-written
code in `packages/typing-game/client/src/` or `packages/website/src/`.
Not "works." Not "structurally valid." Typing-game quality.

Read FIRST, in this order:
1. <absolute path to generated src/ files — list every file>
2. /Users/devinjameson/Repos/foldkit/skills/generate-program/architecture.md
3. /Users/devinjameson/Repos/foldkit/skills/generate-program/conventions.md
4. /Users/devinjameson/Repos/foldkit/skills/generate-program/checklist.md
5. At least one exemplar file matching the generated app's complexity:
   - Tier 1-2: packages/foldkit/src/runtime/runtime.ts (for quality calibration)
   - Tier 3-4: examples/weather/src/main.ts OR examples/form/src/main.ts
   - Tier 5: examples/kanban/src/update.ts AND examples/kanban/src/domain/
   - Tier 6: examples/job-application/src/update.ts AND examples/auth/src/page/
   - Tier 7: packages/typing-game/client/src/page/room/

Then walk the entire checklist.md against the generated code. Every item.
Also read at least one of the generated files side-by-side with the
exemplar you chose. Ask: does this look like it was written by the
same hand?

COMMON BLIND SPOTS — check each explicitly, these are frequently missed:

1. OFF-BY-ONE ERRORS. Any logic with "after N", modulo, "every Nth",
   counter thresholds, or cycle boundaries. Trace the logic for N=0,
   N=1, and the first transition. Does the boundary go where it should?
   Example to look for: `count % 4 === 0` triggers on count=0 too —
   is that intended or a bug?

2. SKIP / RESET SEMANTICS. If the app has skip, reset, cancel, or
   undo actions, trace what happens to counters and derived state.
   Does skip increment or bypass the counter? Does reset clear the
   counter or preserve it? Is the behavior consistent with what a
   user would expect?

3. STATE MACHINE EDGES. Every discriminated-union state. Can the
   current code transition *into* every state? Out of every state?
   Are there dead states (created, never entered)? Impossible
   transitions (states that should be reachable but aren't)?

4. REDUNDANT DERIVED DATA IN MODEL. Fields that could be computed
   from other fields. Example: `endTime` AND `remainingMs` on the
   same state — one can drift. Flag these unless there's a concrete
   reason (view needs pure data, etc.) — and if there IS a reason,
   the code should document it.

5. REPEATED INLINE PATTERNS. If three or four handlers share the
   same 5-line scaffold (M.tag + M.orElse, Option.match + fallback,
   etc.), that scaffold wants a named helper. Don't flag every
   repetition, but flag genuinely duplicated decision logic.

6. FUNCTIONS THAT DO TWO THINGS. Orchestrators that mix "decide
   what to do" with "do it." Helpers with an `if` that branches
   into two unrelated behaviors. Handlers that both mutate state
   AND emit a command in a way that conflates the decisions.

7. NAMING DRIFT. One Message uses `Updated*`, another uses
   `Changed*` for the same kind of event. One helper is `whenX`,
   another is `handleX` for analogous cases. Consistency matters
   — diverging naming is a quality regression.

8. EFFECT MODULE INCONSISTENCY. Mixing `items.map(f)` and
   `Array.map(items, f)` in the same file. Mixing `Option.match`
   with `maybe.pipe(Option.map(...), Option.getOrElse(...))` for
   similar code. One file should use one idiom throughout.

9. EMPTY-OBJECT CONSTRUCTOR CALLS. No-field tagged structs and
   messages should be called with NO argument — `Idle()`, `Work()`,
   `ClickedSubmit()`. Never `Idle({})`, `Work({})`. Both compile,
   but exemplars consistently use the no-arg form. The `({})` form
   reads as "a value with some empty object in it" and makes a
   reader wonder what's supposed to be there. Grep for `({})` as a
   quick scan — should be zero matches in generated code.

10. DEAD STATE VARIANTS. State variants (or fields on state
    variants) that are assigned but never observed downstream.
    Examples:
    - `Saving` state set on submit, but the update also navigates
      away before the view renders — the user never sees "Saving."
    - `SaveError` set on failure, but the form is no longer
      visible because the user already navigated to the home route
      on the optimistic submit. Error is unreachable to the user.
    - `Running.remainingMs` stored alongside `endTime`, where
      `remainingMs = endTime - now` — one can drift from the other.
    - A field in Model that's written by updates but never read by
      the view or other updates.

    **The "navigate-before-save" pattern is a specific instance to
    look for**: if an update handler emits BOTH `saveState(...)`
    AND `navigateInternal(...)` in the same return, the navigation
    races the save. A failure surfaced on the old page is
    unreachable. The idiomatic pattern is: emit save only, then
    navigate in the `Succeeded*` handler. Errors then surface on
    the page the user is still looking at.

    For every discriminated-union variant, trace whether the view
    branches on it and whether the branch is actually reachable.
    For every Model field, trace whether it's read anywhere except
    its own writes. If not, flag it — either the code is missing
    something, or the variant/field should be deleted.

11. HARD-CODED ROUTE PATHS. Template strings for internal navigation
    (`Href('/')`, `navigateInternal('/new')`, `/tag/${name}`). Route
    parsers are bidirectional — each router is callable as a printer:
    `Href(homeRouter())`, `navigateInternal(newLinkRouter())`,
    `Href(tagFilterRouter({ tag: name }))`. Grep for `Href('/` and
    `navigateInternal('/` — should be zero matches in generated code.

12. HAND-ROLLED ACCESSIBLE WIDGETS. Raw `input`, `textarea`, `button`,
    `dialog`, or any element with `role="menu"` / `role="dialog"` /
    `role="tab"`. Foldkit ships `Ui.Input`, `Ui.Textarea`, `Ui.Button`,
    `Ui.Dialog`, `Ui.Menu`, `Ui.Tabs` etc. — the whole component table
    in Phase 2.5. If a form renders `input(...)` directly, that's a
    BLOCKER unless there's a `// NOTE:` comment explaining why the
    component can't be used. Hand-rolling isn't a style preference;
    it's skipping accessibility work. Grep `src/` for the bare
    elements and flag every match that isn't in a NOTE-justified
    escape hatch.

13. A11Y GAPS. For anything NOT covered by a Ui.* component (static
    content, custom layouts, any residual hand-rolled input), verify:
    label/input association via `For(id)` + `Id(id)`, dynamic errors
    announced via `Role('alert')` or `AriaLive('polite')`, icon-only
    buttons have `AriaLabel(...)`, external links have
    `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic
    landmarks (`main`, `nav`, `header`) instead of `div` soup. The
    checklist.md "Accessibility" section lists concrete grep commands;
    run the ones relevant to what the generator built.

14. MISSING SCENE TEST. For Tier 3+ apps (routing, async Commands,
    forms), `main.scene.test.ts` must exist. Check the file tree —
    if it's absent and the app is Tier 3+, that's a BLOCKER, not a
    QUALITY item. Story tests alone test the update function in
    isolation; Scene tests test the rendered view through accessible
    locators, which is what a real user interacts with. An app
    without a scene test hasn't been tested at all from the user's
    perspective.

    Also: **Scene tests must contain assertions.** A `Scene.scene(...)`
    call with only `Scene.with(model)` and no `Scene.expect(...)` or
    `Scene.click(...).resolve(...)` only verifies the view doesn't
    throw. Each test needs at least one `Scene.expect(locator).toX()`
    or an interaction that asserts on the resulting state.

15. ARIA ROLE CONFUSION.
    - **Checkboxes**: `Role('checkbox')` + `AriaChecked(boolean)`.
      Screen readers announce "checkbox, checked/unchecked."
    - **Toggle buttons** (Play/Pause, Bold on/off, formatting
      toggles): `AriaPressed(string)` on a `button`. Screen readers
      announce "toggle button, pressed/not pressed."
    Using `AriaPressed` on something the user thinks of as a
    checkbox is wrong semantically. Ask: "does the label say 'Mark
    X as done' (checkbox) or 'toggle bold' (pressed button)?" The
    former is a checkbox role; the latter is a toggle button.

16. UNKEYED LIST ROWS. Rows in a list (li or div returned inside
    `Array.map`) that carry `OnClick` handlers bound to a specific
    item id — without a `keyed('li')(item.id, ...)` wrapper — are a
    snabbdom patching bug. Deleting a row from the middle causes
    the OLD row's click handler to be patched onto what should have
    been a DIFFERENT row. User clicks "Delete B" and habit A is
    deleted. This is the exact failure mode `keyed` exists to prevent,
    and it's subtle because the bug is invisible until a delete or
    reorder happens mid-list. Every row renderer that consumes a
    domain entity with an `id` field should return `keyed('li')(item.id, ...)`
    or `keyed('div')(item.id, ...)`, not bare `li(...)`.

Output format — exactly this structure:

## BLOCKERS
Items that are structurally wrong, logically buggy, or violate
conventions. Must fix.
Each item: `path/to/file.ts:line — what's wrong — what to fix`.
If none: write `None.`

## QUALITY
Items that work but fall short of the bar: generic naming, inline
handlers that should be extracted, missing domain/ directory,
native methods instead of Effect modules in pipes, views that
should be decomposed, etc. These should be fixed.
Each item: `path/to/file.ts:line — the gap — the idiomatic version`.
Cite the exemplar when possible: "typing-game does this as X at
page/home/update/handleKeyPressed.ts:33-40".
If none: write `None.`

## NICE-TO-HAVE
Polish items that would push quality further but aren't required:
additional tests, slightly better names, minor refactors.
If none: write `None.`

## VERDICT
One of:
- `PASS` — the code is at the bar. Ship it.
- `NEEDS-WORK` — there are BLOCKERS or QUALITY items to address.

Do NOT write code. Review only. Be specific, be brutal, don't grade on
a curve. If you're unsure whether something is at the bar, compare it
to the exemplar — if the exemplar wouldn't write it that way, flag it.

Before finishing, confirm the generator ran all three gates. If the
generator claims Phase 5 complete but lint output wasn't shown, flag
it as a BLOCKER: "Run `npm run lint` — unverified." Lint catches unused
imports that tsc does not, and those leak into review as noise.
```

### After the loop

- If verdict is `PASS` on any round → proceed to Phase 7, no caveats.
- If verdict is `NEEDS-WORK` after round 3 → proceed to Phase 7 but list the outstanding `BLOCKERS` and `QUALITY` items in the Explain output under "Known polish areas." The user should see them.

### Between rounds: actually fix, don't just acknowledge

Between rounds, the generator MUST actually apply fixes for every BLOCKER and every QUALITY item the reviewer flagged. Do not carry forward items with "I'll note this" or "deferring" unless the round budget is exhausted. A QUALITY item the reviewer flagged in round N that's still present in round N+1 is a process failure — it means the generator read the review and then didn't act.

Common failure mode: the reviewer flags `.length > 0` checks as QUALITY and notes `Array.match`/`String.isNonEmpty` as the fix. The generator moves to other fixes, the round 2 review flags the same thing again, and nothing happens because "round 2 is clean on BLOCKERS so we're good." It isn't good. Untriaged QUALITY items become silently-shipped rot.

Before running round N+1, produce a short written diff between "what round N flagged" and "what I changed." If the lists don't match, go back and fix the gap before running round N+1.

## Phase 7: Explain

After generating the program (and passing review), walk the user through what was built:

1. **Files generated** — list each file with a one-line description of what it contains and why it exists as a separate file (or why everything is in one file)
2. **Architecture decisions** — explain key modeling choices, for example: which discriminated unions were used and why, which Foldkit UI components were integrated, why flags were or weren't needed, any domain extraction decisions, etc.
3. **Review outcome** — state how many review rounds ran and the final verdict. If `PASS`, say so. If `NEEDS-WORK` after round 3, list the outstanding items verbatim under "Known polish areas" so the user knows what the reviewer flagged that didn't get fixed.
4. **How to run** — remind the user to start the dev server and what they should see
5. **How to extend** — give concrete next steps: "to add bookmark editing, define `ClickedEditBookmark` and `UpdatedEditTitle` Messages, add an `Editing` variant to the Model, and handle both in update"
6. **When to restructure** — mention signals that the program has outgrown its current file organization (e.g., "if update exceeds ~20 cases, consider extracting a Submodel")
