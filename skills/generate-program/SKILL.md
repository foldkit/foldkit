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
6. **UI component needs** — interactive widgets that map to Foldkit UI components (e.g., "dropdown" → Menu, "modal" → Dialog, "tabs" → Tabs, "autocomplete" → Combobox)

Present this analysis to the user before proceeding.

If the description is detailed and unambiguous, summarize the analysis and confirm before moving on. But if there are gaps — unclear state transitions, vague UI requirements, unspecified error handling, missing edge cases, ambiguous domain boundaries — ask targeted clarifying questions before proceeding. Don't ask open-ended questions like "anything else?" — ask specific questions about the gaps you found. For example:

- "Should the todo list persist across page reloads (localStorage), or start fresh each session?"
- "When the API call fails, should the app show an inline error or a dialog?"
- "You mentioned 'users can edit items' — is that inline editing or a separate edit page?"

The goal is to resolve ambiguity early so the generated code matches what the user actually wants, not what you assumed.

## Phase 2: Study Reference Examples

Read the architecture and conventions guides to internalize the rules:

- [Architecture guide](architecture.md) — TEA structure, file organization, type patterns
- [Conventions guide](conventions.md) — naming, Effect-TS patterns, anti-patterns

If you have access to a context7 MCP tool, use it to look up Effect-TS documentation when you're unsure about an API. Effect is a large library — verify function signatures rather than guessing.

Then read the example files that match the app's complexity. **Always read at least one example** — never generate from memory alone.

### Complexity tiers

**Tier 1 — Single page, no async, minimal state:**
Read `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`

**Tier 2 — Forms, input handling, local validation:**
Read `${CLAUDE_SKILL_DIR}/../../examples/todo/src/main.ts`

**Tier 3 — Async operations, loading/error states, API calls:**
Read `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts` and `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts`

**Tier 4 — URL routing, multiple pages, query parameters:**
Read `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts` and `${CLAUDE_SKILL_DIR}/../../examples/query-sync/src/main.ts`

**Tier 5 — Complex state, nested domain models, CRUD:**
Read `${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/main.ts`

**Tier 6 — Submodels, OutMessage, auth flows, multi-module apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/auth/src/main.ts`

**Tier 7 — Real-time, WebSocket, managed resources, production-grade:**
Read `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/main.ts`, then explore its `page/home/` and `page/room/` directories for the full Submodel/OutMessage pattern.

Read examples from the target tier AND all lower tiers. A Tier 4 app should reflect patterns from Tiers 1-3 as well.

## Phase 2.5: Identify Foldkit UI Component Opportunities

Foldkit ships accessible UI components that handle keyboard navigation, ARIA attributes, and focus management automatically. Before generating, check if any part of the app maps to a built-in component:

| User Need                     | Foldkit Component | What you get for free                                      |
| ----------------------------- | ----------------- | ---------------------------------------------------------- |
| Modal/dialog/confirmation     | `Dialog`          | Focus trapping, Escape to close, scroll locking, backdrop  |
| Tabbed content                | `Tabs`            | Arrow key navigation, aria-selected, roving tabindex       |
| Dropdown menu                 | `Menu`            | Arrow keys, typeahead search, aria-expanded, click-outside |
| Autocomplete/tag input        | `Combobox`        | Filtering, arrow key selection, aria-activedescendant      |
| Select dropdown               | `Select`          | Keyboard selection, aria-selected, positioning             |
| Single selection from options | `RadioGroup`      | Arrow key cycling, aria-checked                            |
| On/off toggle                 | `Switch`          | Spacebar toggle, aria-checked                              |
| Boolean option                | `Checkbox`        | Spacebar toggle, aria-checked, indeterminate               |
| Expandable section            | `Disclosure`      | Enter/Space toggle, aria-expanded                          |
| Tooltip/floating content      | `Popover`         | Positioning, click-outside, focus management               |
| Single-select list            | `Listbox`         | Arrow keys, typeahead, aria-selected                       |
| Text input                    | `Input`           | Consistent styling/behavior wrapper                        |
| Multi-line text               | `Textarea`        | Auto-resize, consistent styling                            |
| Form group                    | `Fieldset`        | Disabled state propagation, grouping                       |
| Styled button                 | `Button`          | Consistent click/keyboard handling                         |

Each component is a Foldkit Submodel with its own Model, Message, init, update, and view. To use one:

1. Add its Model to your Model: `confirmDialog: Ui.Dialog.Model`
2. Add a `Got*` Message: `GotConfirmDialogMessage` with `{ message: Ui.Dialog.Message }`
3. Initialize in init: `confirmDialog: Ui.Dialog.init({ id: 'confirm-dialog' })`
4. Delegate in update: `GotConfirmDialogMessage: ({ message }) => ...`
5. Render in view: `Ui.Dialog.view(model.confirmDialog, ...)`

**Always prefer Foldkit UI components over hand-rolling interactive widgets.** They make accessibility the default, not an afterthought.

If the app uses UI components, **always read the ui-showcase example first** to understand how components are wired — this is the canonical reference for Foldkit UI integration patterns:

- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/main.ts` — root wiring, `Got*` delegation, `toMessage` helpers
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/message.ts` — how UI component Messages are structured
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/model.ts` — how UI component Models are composed
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/update.ts` — how UI component updates are delegated

## Phase 3: Determine File Organization

Match the file structure to the app's complexity. The architecture stays the same at every scale — only the file organization changes.

**Single file** (Tier 1-2, under ~300 lines):

```
src/main.ts          ← Model, Message, init, update, view all inline
```

**Split commands** (Tier 3, has async operations):

```
src/main.ts          ← Model, Message, init, update, view
src/command.ts       ← Command functions
```

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

Then replace the counter example code in `src/main.ts` (and add additional source files as needed) with the generated app code.

## Phase 4: Generate the App

Generate files following the architecture and conventions guides exactly. Write all source files into the scaffolded project's `src/` directory. For each file, follow these rules:

### Model

- Define as `S.Struct` with Effect Schema types
- Use discriminated unions for state: `Idle | Loading | Error | Ok`, never booleans for multi-valued state
- Use `Option` for fields that may be absent — never empty strings or null
- Prefix Option-typed fields with `maybe`: `maybeCurrentUser`, `maybeError`
- Use `makeRemoteData` pattern for async data (define `Idle`, `Loading`, `Error`, `Ok` variants with `ts()`)
- For apps with multiple domain entities referenced across modules, extract shared schemas into `src/domain/` (e.g., `domain/product.ts`, `domain/session.ts`). See the shopping-cart and auth examples for this pattern, and read `${CLAUDE_SKILL_DIR}/../../packages/website/src/page/projectOrganization.ts` for guidance on when and how to structure domain modules

### Messages

Follow the four-group layout strictly:

```ts
// Group 1: All m() declarations, no blank lines between them
const ClickedSubmit = m('ClickedSubmit')
const ChangedEmail = m('ChangedEmail', { value: S.String })
const SucceededLogin = m('SucceededLogin', { user: User })
const FailedLogin = m('FailedLogin', { error: S.String })
const CompletedFocusInput = m('CompletedFocusInput')

// Group 2: Union + type (no blank line between them)
const Message = S.Union(
  ClickedSubmit,
  ChangedEmail,
  SucceededLogin,
  FailedLogin,
  CompletedFocusInput,
)
type Message = typeof Message.Type
```

Name messages by category:

- `Clicked*` — button/link clicks
- `Changed*` — input value changes, with `{ value: S.String }`
- `Submitted*` — form submissions
- `Succeeded*` / `Failed*` — paired, for commands that can meaningfully fail
- `Completed*` — fire-and-forget (verb+object: `CompletedFocusInput`)
- `Got*` — child module results via OutMessage pattern
- `Updated*` — external state changes (WebSocket, subscription data)
- `Loaded*` — data restored from storage
- `Pressed*` — keyboard input
- `Blurred*` — focus loss

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
- Always `Effect.catchAll(() => Effect.succeed(FailedX(...)))` — Commands never throw
- Use `Effect.provide` for services
- Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- Fire-and-forget Commands return `Completed*` Messages
- Use `Task` helpers for DOM operations (`Task.focus`, `Task.scrollIntoView`, `Task.showModal`, `Task.delay`, etc.) — see Task Helpers in [architecture.md](architecture.md)
- For HTTP requests, use `HttpClient` from `@effect/platform` — see the weather example for the pattern

### View

- Destructure html elements: `const { div, span, button, input } = html<Message>()`
- Use `Class(...)` for Tailwind classes
- Use `clsx` from the `clsx` package for conditional class composition: `Class(clsx('base-classes', { 'active-class': isActive, 'bg-blue-500': variant === 'Primary' }))`. Use `clsx` whenever classes depend on model state, boolean flags, or discriminated union tags — never string concatenation, template literals, or `&&` expressions
- Pattern match on model state: `M.value(model.state).pipe(M.tagsExhaustive({...}))`
- Use `Option.match` for conditional rendering based on Option fields
- Use `keyed('div')(routeOrStateTag, attrs, children)` on layout branches
- Delegate complex sections to extracted view functions
- Wire events to messages: `OnClick(() => ClickedSubmit())`, `OnInput(value => ChangedEmail({ value }))`
- Use Foldkit UI components when the interaction matches (Dialog for modals, Tabs for tabbed content, etc.)

### Runtime Wiring

- Use `Runtime.makeElement` for apps without URL routing (no pages/navigation)
- Use `Runtime.makeApplication` for apps with routing — requires `browser: { onUrlRequest, onUrlChange }` config
- See the Element vs Application section in [architecture.md](architecture.md) for the full pattern
- Include `ClickedLink` and `ChangedUrl` Messages for applications, with proper `InternalUrl`/`ExternalUrl` handling in update
- Always end with `Runtime.run(element)` or `Runtime.run(app)`

### Routes (if multi-page)

- Use bidirectional parser: `r()`, `param()`, `literal()`, `oneOf()`
- Define route schemas with `r('RouteName', { param: S.String })`
- Key view content on `model.route._tag`
- Use `pushUrl` from `foldkit/navigation` in Commands for programmatic navigation

### Subscriptions (if real-time)

- Define with `Subscription.makeSubscriptions(Deps)<Model, Message>`
- `modelToDependencies` extracts Subscription parameters from Model
- `dependenciesToStream` builds `Stream<Message>` from dependencies
- Subscriptions auto-start/stop based on Model state — never manually managed
- For Subscriptions with no Model dependencies (always active), use `S.Null` as the dependency type and return `null` from `modelToDependencies`

## Phase 5: Verify

Run `npx tsc --noEmit` in the project directory. Fix any type errors — the type system is the source of truth for API correctness (especially for Foldkit UI component APIs).

Then run through the [verification checklist](checklist.md) to catch structural gaps. Fix any remaining issues before presenting the result.

## Phase 6: Explain

After generating the program, walk the user through what was built:

1. **Files generated** — list each file with a one-line description of what it contains and why it exists as a separate file (or why everything is in one file)
2. **Architecture decisions** — explain key modeling choices, for example: which discriminated unions were used and why, which Foldkit UI components were integrated, why flags were or weren't needed, any domain extraction decisions, etc.
3. **How to run** — remind the user to start the dev server and what they should see
4. **How to extend** — give concrete next steps: "to add bookmark editing, define `ClickedEditBookmark` and `ChangedEditTitle` Messages, add an `Editing` variant to the Model, and handle both in update"
5. **When to restructure** — mention signals that the program has outgrown its current file organization (e.g., "if update exceeds ~20 cases, consider extracting a Submodel")
