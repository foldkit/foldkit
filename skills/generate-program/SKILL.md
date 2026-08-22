---
name: generate-program
description: Generate a complete, idiomatic Foldkit program from a natural language description. Use when the user wants to create a new Foldkit program, scaffold a project, or says things like "build me a..." or "I want a program that..."
argument-hint: [description of the program you want]
---

Generate a complete Foldkit program based on this description:

**$ARGUMENTS**

## Phase 1: Analyze the Description

Before writing any code, analyze the description to identify:

1. **Domain entities**: nouns that become Model fields (e.g., "todos", "user", "score")
2. **User interactions**: verbs that become Messages (e.g., "add", "delete", "filter", "submit")
3. **Async operations**: external data that becomes Commands (e.g., "fetch weather", "save to localStorage")
4. **Real-time needs**: streaming data that becomes Subscriptions (e.g., "live updates", "countdown", "WebSocket")
5. **Pages/navigation**: URL structure that becomes routes (e.g., "home page", "detail page")
6. **UI component needs**: interactive widgets that map to Foldkit UI components (e.g., "dropdown" → Menu, "modal" → Dialog, "tabs" → Tabs, "autocomplete" → Combobox, "date picker" → DatePicker, "file upload" → FileDrop, "reorderable list" → DragAndDrop, "toast/notification" → Toast, "hover tooltip" → Tooltip, "range/price filter" → Slider, "long scrolling list" → VirtualList)
7. **Form validation needs**: required fields, format checks, async uniqueness → `foldkit/fieldValidation` module (see Phase 4)
8. **Date handling**: birthdays, deadlines, scheduling → `Calendar` module + `DatePicker` or `Calendar` from `@foldkit/ui`
9. **File handling**: uploads, attachments, images → `File` module + `FileDrop` from `@foldkit/ui`
10. **Remote data**: anything fetched, cached, refreshed, or revalidated → the `AsyncData` module (see Phase 4). Don't hand-roll a loading/error union
11. **Multi-state flows**: a described process that moves through several named steps with rules about which step follows which (checkout, onboarding, multi-step approval, a connection lifecycle) → consider the `Machine` module (`foldkit/experimental`). Writing the transitions as a table makes the edge set enumerable, so `unreachableStates()` and `deadTransitions()` catch a missing or unreachable step by computation instead of by review. Raise it as an option in the analysis you present, noting it is under `experimental/`, and let the user choose. Plain `ts()` unions with one `M.tagsExhaustive` are still right for a flow of two or three states. `repos/foldkit/examples/state-machine/` is the reference
12. **Host embedding**: the program runs inside another app ("a widget in our React app", "embed this in an existing page", "the host needs to control it") → `Runtime.makeElement` plus the `Runtime.embed` lifecycle handle, with Flags for initial data and Ports for ongoing communication in both directions. `repos/foldkit/examples/embedding/` is the canonical reference: a plain TypeScript host driving a Foldkit widget end to end

Present this analysis to the user before proceeding.

If the description is detailed and unambiguous, summarize the analysis and confirm before moving on. But if there are gaps (unclear state transitions, vague UI requirements, unspecified error handling, missing edge cases, ambiguous domain boundaries, unclear counter/reset semantics), ask targeted clarifying questions before proceeding. Don't ask open-ended questions like "anything else?". Ask specific questions about the gaps you found.

**UX/behavior gaps:**

- "Should the todo list persist across page reloads (localStorage), or start fresh each session?"
- "When the API call fails, should the app show an inline error or a dialog?"
- "You mentioned 'users can edit items'. Is that inline editing or a separate edit page?"

**Domain-logic gaps (easy to miss, expensive to fix):**

- "When the user skips an interval, does that count as 'completed' for purposes of the streak?"
- "Does a counter that tracks 'completed' increments on successful actions only, or on skipped actions too?"
- "If the user triggers a reset mid-flow, does the counter reset with it, or persist across resets?"
- "You mentioned 'after N events, trigger X'. Is that N events total, or N events since the last X?"
- "On the Nth action in a cycle, which action does it trigger, the cycle's first or last?"

Domain-logic questions often surface off-by-one bugs before they hit the code. If the description has any counter, cycle, streak, or "after N" phrase, ask about edge cases at 0 and 1 and N specifically.

The goal is to resolve ambiguity early so the generated code matches what the user actually wants, not what you assumed.

## Phase 2: Study Reference Examples

Read the architecture and conventions guides to internalize the rules:

- [Architecture guide](architecture.md): TEA structure, file organization, type patterns
- [Conventions guide](conventions.md): naming, Effect-TS patterns, anti-patterns
- [Verification checklist](checklist.md): not just for Phase 5, also the generation bar. Skim the **Quality Bar** section now so you generate code that already meets it rather than code that will fail review.
- [Blind spots](blindSpots.md): what the Phase 6 reviewer will grade you against. Reading it now is cheaper than fixing it later.

These four files are a snapshot of a moving codebase. When they disagree with the live source (`repos/foldkit/`, or the `.d.ts` in `node_modules`), the live source is right. Treat the disagreement as a bug in this skill and say so in your final report.

If you have access to a context7 MCP tool, use it to look up Effect-TS documentation when you're unsure about an API. Effect is a large library. Verify function signatures rather than guessing.

### Quality exemplars

Two codebases are the _quality bar_ for generated apps. Not just "patterns to copy" but "the level of craft to match":

- `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/`: production multi-page app: Submodels, OutMessage, update/view decomposition, curried handler extraction, subscription patterns, domain modules.
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/`: production Foldkit website: page organization, shared view primitives, route-driven rendering, idiomatic domain separation.

Before generating, spot-check at least ONE file from each (the shape of `update.ts` / how handlers get extracted / how domain files are structured) and match that level of craft in your output. The generated code should be indistinguishable from hand-written exemplar code.

Then read the tier-specific example files that match the app's complexity. **Always read at least one tier-specific example.** Never generate from memory alone.

### Complexity tiers

**Tier 1: Single page, no async, minimal state:**
Read `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`

**Tier 2: Timers, subscriptions, simple stateful apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/main.ts` (timer via subscription, `Duration` field pattern) and `${CLAUDE_SKILL_DIR}/../../examples/todo/src/main.ts` (CRUD with localStorage via Flags)

**Tier 3: Async operations, loading/error states, API calls, form validation:**
Read `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts` (HTTP with `HttpClient`) and `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts` (uses `foldkit/fieldValidation`; see the Form Validation section in Phase 4)

**Tier 4: URL routing, multiple pages, query parameters:**
Read `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts` and `${CLAUDE_SKILL_DIR}/../../examples/query-sync/src/main.ts`

**Tier 5: Complex state, nested domain models, CRUD, drag-and-drop:**
Read `${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/main.ts` (nested domain schemas, cart state) and `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/main.ts` (CRUD with `DragAndDrop`, Flags restoring from localStorage, subscriptions)

**Tier 6: Submodels, OutMessage, multi-step forms, auth flows, multi-module apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/auth/src/main.ts` (login/signup with Submodels, OutMessage, protected routes) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/main.ts` (multi-step form with deeply nested Submodels in `step/`, `DatePicker`, `FileDrop`, `Listbox`, `Calendar` module for date handling)

**Tier 7: Real-time, WebSocket, Managed Resources, production-grade:**
Read `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/update.ts`, then explore its `page/home/` and `page/room/` directories for the full Submodel/OutMessage pattern.

Read examples from the target tier AND all lower tiers. A Tier 4 app should reflect patterns from Tiers 1-3 as well.

## Phase 2.5: Identify Foldkit UI Component Opportunities

Foldkit ships accessible UI components that handle keyboard navigation, ARIA attributes, and focus management automatically. They live in a **separate package**, `@foldkit/ui`, and are imported by name:

```ts
import { Button, Dialog, Input } from '@foldkit/ui'
```

There is no `Ui` namespace on the `foldkit` package. Reach for `Dialog.view`, not `Ui.Dialog.view`. Deep imports (`@foldkit/ui/dialog`) work too when you want to keep the barrel out of the bundle.

Before generating, check if any part of the app maps to a built-in component:

| User Need                       | Component     | What you get for free                                           |
| ------------------------------- | ------------- | --------------------------------------------------------------- |
| Modal/dialog/confirmation       | `Dialog`      | Focus trapping, Escape to close, scroll locking, backdrop       |
| Tabbed content                  | `Tabs`        | Arrow key navigation, aria-selected, roving tabindex            |
| Dropdown menu                   | `Menu`        | Arrow keys, typeahead search, aria-expanded, click-outside      |
| Autocomplete/tag input          | `Combobox`    | Filtering, arrow key selection, aria-activedescendant           |
| Select dropdown                 | `Select`      | Keyboard selection, aria-selected, positioning                  |
| Single selection from options   | `RadioGroup`  | Arrow key cycling, aria-checked, read-only navigation           |
| On/off toggle                   | `Switch`      | Spacebar toggle, aria-checked                                   |
| Boolean option                  | `Checkbox`    | Spacebar toggle, aria-checked, indeterminate                    |
| Expandable section              | `Disclosure`  | Enter/Space toggle, aria-expanded                               |
| Floating content on hover/click | `Popover`     | Positioning, click-outside, focus management                    |
| Hover tooltip                   | `Tooltip`     | Show-delay, keyboard dismiss, positioning, aria-describedby     |
| Single-select list              | `Listbox`     | Arrow keys, typeahead, aria-selected                            |
| Text input                      | `Input`       | Consistent styling/behavior wrapper                             |
| Multi-line text                 | `Textarea`    | Auto-resize, consistent styling                                 |
| Form group                      | `Fieldset`    | Disabled state propagation, grouping                            |
| Styled button                   | `Button`      | Consistent click/keyboard handling                              |
| Inline calendar grid            | `Calendar`    | Month navigation, keyboard nav, aria-selected, date constraints |
| Date input + popover            | `DatePicker`  | Calendar popover, input masking, keyboard nav, constraints      |
| File upload zone                | `FileDrop`    | Drag-and-drop, click-to-browse, accept filters, validation      |
| Reorderable list                | `DragAndDrop` | Pointer + keyboard drag, drop zones, announcement region        |
| Transient notifications         | `Toast`       | Auto-dismiss, pause-on-hover, stacking, role=status/alert       |
| Numeric range / price filter    | `Slider`      | Arrow/Home/End keys, aria-valuenow, multi-thumb ranges          |
| Long scrolling list             | `VirtualList` | Windowed rendering, scroll anchoring, measured item heights     |
| Site/section navigation         | `Nav`         | Current-page marking, keyboard traversal, landmark semantics    |

The package is not one shape.

**Stateful Submodels** carry their own Model, Message, update, and (mostly) OutMessage, and are embedded via `h.submodel`: `Menu`, `Listbox`, `Combobox`, `Calendar`, `DatePicker`, `Dialog`, `Popover`, `RadioGroup`, `Tabs`, `Tooltip`, `FileDrop`, `DragAndDrop`, `Slider`, `VirtualList`, plus `Toast` once built through `Toast.make(PayloadSchema)`.

**Stateless render helpers** have no Model at all. You call `view` directly with a ViewConfig and your own `h`, and store the value in your own Model: `Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`.

Don't take that split on faith, because components have moved across it (`Checkbox`, `Switch`, and `Disclosure` became controlled render helpers; `RadioGroup` became a Submodel; `Tabs` and `Slider` moved their selection to the parent Model). Read the component's `public.d.ts`: exporting `Model` and `update` means Submodel, exporting only `view` and a `ViewConfig` / `ViewInputs` type means render helper. A render helper does not want a `Got*` Message.

To use a stateful Submodel:

1. Add its Model to your Model: `confirmDialog: Dialog.Model`
2. Add a `Got*` Message: `GotConfirmDialogMessage` with `{ message: Dialog.Message }`
3. Initialize in init: `confirmDialog: Dialog.init({ id: 'confirm-dialog' })`
4. Delegate in update: `GotConfirmDialogMessage: ({ message }) => ...`
5. Embed in view via `h.submodel`: `h.submodel({ slotId: 'confirm-dialog', view: Dialog.view, model: model.confirmDialog, toParentMessage: message => Message.GotConfirmDialogMessage({ message }) })` (add `viewInputs` for components whose view takes them)

**Always prefer Foldkit UI components over hand-rolling interactive widgets.** They make accessibility the default, not an afterthought.

**For form inputs specifically:** every text input, textarea, and button in a form MUST go through `Input`, `Textarea`, and `Button`. This is not optional, even though raw `input`/`textarea` HTML elements are available on the view's builder `h`. The form example (`examples/form/src/main.ts`) defines `inputFieldView` and `textareaFieldView` helpers that wrap `Input.view` and `Textarea.view` with label + validation feedback. Copy that helper pattern. Raw `input`/`textarea` are for non-form cases (search fields, inline editors) where you're intentionally working below the component layer, and even then, reach for the component first.

If the app uses UI components, **always read the ui-showcase example first** to understand how components are wired. This is the canonical reference for Foldkit UI integration patterns:

- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/main.ts`: root wiring, `Got*` delegation, `toParentMessage` helpers
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/message.ts`: how component Messages are structured
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/model.ts`: how component Models are composed
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/update.ts`: how component updates are delegated
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/subscriptions.ts`: which components need Subscriptions lifted into the parent (`DragAndDrop`, `Slider`, `VirtualList`)
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/toast.ts`: read when using `Toast`. It's unique in that it's parameterized on a payload schema via `Toast.make(PayloadSchema)`, returning a typed module you import from

Directory names under `examples/ui-showcase/src/` have moved before. List the directory rather than trusting these paths blind.

For apps using `DatePicker`, `FileDrop`, or other recently-added components, also read the `job-application` example (see Tier 6 below). It's the most complete real-world integration of these components together.

## Phase 3: Determine File Organization

Match the file structure to the app's complexity. The architecture stays the same at every scale; only the file organization changes.

### What lives in which file

Beyond the tier-based layouts below, follow these "schema placement" rules to avoid model.ts bloat:

- **`model.ts`** holds the `Model` schema + any schemas that are fields of Model (or composed into fields, like form state / submit state unions). Nothing else.
- **`command.ts`** holds schemas for the payloads commands send to / receive from external systems, in particular the persistence schema that `saveState` serializes and `flags` deserializes. The persistence schema is a command-layer concern, not a model concern; it often looks like a subset of Model but it isn't part of Model.
- **`domain/*.ts`** holds domain entity schemas and pure operations on them.
- **`message.ts`** holds messages (only).
- **`route.ts`** holds route variants + router pipelines.

A common mistake (because kanban colocates `SavedBoard` in `model.ts`): putting the persistence schema in `model.ts` because "it's schema." It's schema for the persistence layer, not for the Model. Move it to where it's used.

**Single file** (Tier 1-2, under ~300 lines):

```
src/main.ts          ← Model, Message, init, update, view
src/entry.ts         ← Runtime.makeApplication + Runtime.run
```

**Split commands + messages** (Tier 3, has async operations):

```
src/main.ts          ← Model, init, update, view
src/entry.ts         ← Runtime.makeApplication + Runtime.run
src/message.ts       ← Message definitions
src/command.ts       ← Command functions
```

**Important rule:** if you extract `command.ts`, you MUST also extract `message.ts`. Commands reference Message constructors (for example, `Message.SucceededFetchWeather({...})`) as their Effect return values. If Messages live in `main.ts` and Commands live in `command.ts`, `command.ts` imports from `main.ts` _and_ `main.ts` uses Commands from `command.ts`, a circular import. Pull Messages out first, then both `main.ts` and `command.ts` import the `Message` namespace from `message.ts`.

**Full split** (Tier 4-5, multiple concerns):

```
src/main.ts          ← init, update, view
src/entry.ts         ← Runtime.makeApplication + Runtime.run
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
src/entry.ts         ← Runtime.makeApplication + Runtime.run
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

For Tier 4+ apps (routing, domain modules, multiple entities, submodels) produce a compact sketch BEFORE generating implementations. Tier 1-3 apps are small enough to generate in one pass; Tier 4+ apps burn a lot of effort if the structure is wrong.

The sketch has five parts. Emit them inline in the conversation, get confirmation, THEN scaffold:

1. **File tree**: the exact paths you will create. Match Phase 3's organization.
2. **Model shape**: the top-level `S.Struct` fields and their types. Not the full schema, just the shape.
3. **Message list**: every Message you plan to define, grouped by category (clicks, inputs, commands, out-messages).
4. **Route list**: if routing, every `r('...', {...})` with params and the path each maps to.
5. **Domain operations**: for each file in `domain/`, the operations it will expose (`Link.byNewest`, `Link.filterByTag`, etc.).

Example for a Tier 4 link saver:

```
### Sketch

Files:
  src/main.ts, entry.ts, model.ts, message.ts, command.ts, route.ts
  src/domain/link.ts, index.ts
  src/story.test.ts, scene.test.ts

Model:
  route: AppRoute
  links: ReadonlyArray<Link>
  newLinkForm: NewLinkForm (url: Field<string>, title/description/tagsInput: string, submitState)

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

After emitting the sketch, ask the user to confirm or adjust. Don't start scaffolding or generation until they do. If the user confirms silently (e.g. "looks good, continue"), proceed. If they adjust, iterate on the sketch. Don't write code against a version they haven't approved.

This step is frequently tempting to skip because the agent "knows what it's doing." Skip it and you ship a fully-generated app that turns out to need structural changes. That's the expensive form of iteration. The sketch is the cheap form.

## Phase 3.5: Scaffold the Project

Before generating code, scaffold a runnable project using `create-foldkit-app`:

```bash
npx create-foldkit-app@latest
```

Run with no flags to drop into the interactive prompts; pick the counter example as the base (simplest starting point) and the user's preferred package manager. The generated project includes:

- `package.json` with all Foldkit and Effect dependencies
- `vite.config.ts` with Tailwind and the Foldkit Vite plugin
- `tsconfig.json` with strict TypeScript settings
- `index.html` with the root container
- `src/styles.css` with Tailwind import
- `AGENTS.md` with Foldkit conventions

### Offer the Foldkit subtree

After scaffolding, offer to vendor Foldkit in as a git subtree so future AI sessions can reference the full source, examples, and docs directly from the user's project. Commit the scaffold first so subtree has a base commit to merge into:

```bash
git init          # if not already a git repo
git add .
git commit -m "chore: initial commit"
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash
```

This is optional but strongly recommended. The scaffolded `AGENTS.md` includes a `subtree_prompted: false` line that agents check on future sessions. If the subtree is absent and this flag is false, the agent offers to add it. Handling it up front here means the user's next AI session already has full context. If the user declines, update the line to `subtree_prompted: true` so they aren't asked again.

To refresh the subtree later: `git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash`.

### Replace the scaffold

Then replace the counter example code in `src/main.ts` (and add additional source files as needed) with the generated app code.

## Phase 3.7: Ground the Foldkit APIs

Before writing any code, READ the type signatures of every Foldkit module you will use. Guessing signatures wastes cycles: each wrong guess is a tsc error, a re-read, an edit, another typecheck. Five minutes of reading prevents thirty minutes of iteration.

### The exact files to read

For each Foldkit module you plan to use, read the `.d.ts` at the paths below. Read the public surface; you don't need the internals. Write a short signature crib in your working notes so you don't have to re-check while generating.

```text
# Every app
<project>/node_modules/foldkit/dist/index.d.ts          # top-level re-exports: the authoritative list of what `foldkit` exposes
<project>/node_modules/foldkit/dist/html/index.d.ts     # HtmlBuilder<Message>, element signatures, Attribute<Message>, inertHtml
<project>/node_modules/foldkit/dist/message/index.d.ts  # defineMessageUnion()
<project>/node_modules/foldkit/dist/schema/index.d.ts   # ts(), r()
<project>/node_modules/foldkit/dist/struct/index.d.ts   # evo(): check nested-update signature
<project>/node_modules/foldkit/dist/update/public.d.ts  # Update.Return, Update.ReturnWithOutMessage, Update.combine, Update.refresh
<project>/node_modules/foldkit/dist/runtime/runtime.d.ts # ApplicationInit, RoutingApplicationInit, makeApplication, makeElement

# If using routing
<project>/node_modules/foldkit/dist/route/parser.d.ts   # literal, slash, string, int, Route.root, Route.mapTo, Route.oneOf, Route.parseUrlWithFallback
<project>/node_modules/foldkit/dist/url/index.d.ts      # toString
<project>/node_modules/foldkit/dist/navigation/index.d.ts # pushUrl, load: all return Effect<void> (no Effect.ignore needed)

# If using async / side effects
<project>/node_modules/foldkit/dist/command/index.d.ts  # Command.define: config object with args/messages/interrupt/execute. Command.mapMessages for parent<-child mapping
<project>/node_modules/foldkit/dist/asyncData/public.d.ts # AsyncData: Idle/Loading/Refreshing/Failure/Stale/Success + Schema, match, isPending, hasData, revalidate
<project>/node_modules/foldkit/dist/http/public.d.ts     # Http.layer: provide it to Commands that use HttpClient
<project>/node_modules/foldkit/dist/dom/index.d.ts      # focus, advanceFocus, scrollIntoView, showDialog, closeDialog, clickElement, lockScroll, unlockScroll, inertOthers, restoreInert, detectElementMovement, waitForAnimationSettled. For time/random/uuid/delay use Effect's Clock, Random, Effect.uuid, Effect.sleep + Duration directly.

# If using subscriptions
<project>/node_modules/foldkit/dist/subscription/index.d.ts # Subscription.make<Model, Message>, Subscription.lift, Subscription.aggregate

# If using mount / managed-resource / custom-element
<project>/node_modules/foldkit/dist/mount/public.d.ts            # Mount.define (one-shot) / Mount.defineStream (continuous): per-instance VNode lifecycle
<project>/node_modules/foldkit/dist/managedResource/public.d.ts  # ManagedResource.make / lift / aggregate + tag: for stateful runtime objects keyed on Model condition
<project>/node_modules/foldkit/dist/customElement/index.d.ts     # CustomElement.define: for typed bindings to native web components

# If the host application drives the program
<project>/node_modules/foldkit/dist/port/public.d.ts    # Port.inbound / outbound / emit / stream / subscription

# If using forms
<project>/node_modules/foldkit/dist/fieldValidation/public.d.ts # Field (tagged union), makeRules({required?, rules}), validate, allValid; rule constructors on the Rule namespace (Rule.url(options), Rule.email, Rule.minLength, Rule.pattern, Rule.fromSchema, ...)
# Rule.Rule is [Predicate, Rule.RuleMessage], NOT {test, message}. Field.Invalid has `errors: NonEmptyArray<string>`, not `error: string`.

# If using any UI component (SEPARATE PACKAGE)
<project>/node_modules/@foldkit/ui/dist/<component>/public.d.ts  # Model, Message, init, update, view (Submodel-shaped) or ViewConfig (render-helper-shaped), OutMessage when applicable
# Check: is it a Submodel (Menu/Listbox/Combobox/Calendar/DatePicker/Dialog/Popover/RadioGroup/Tabs/Tooltip/FileDrop/DragAndDrop/Slider/VirtualList/Toast) embedded via h.submodel, or a stateless render helper (Button/Input/Textarea/Select/Fieldset/Checkbox/Switch/Disclosure/Nav) called directly? Submodels carry their own Model/Message/update/OutMessage; render helpers don't. Check ViewInputs (for Submodels) or ViewConfig (for helpers) for the slot callbacks (toView, itemToConfig, etc.).

# If using dates
<project>/node_modules/foldkit/dist/calendar/index.d.ts # CalendarDate, today.local (returns Effect<CalendarDate>); for raw millis use Clock.currentTimeMillis
```

If a path above doesn't resolve, list the package's `dist/` and find the module. **The `.d.ts` is authoritative and this file is not.** Where the two disagree, the `.d.ts` is right and the disagreement is a bug in this skill worth reporting.

### What to record in the crib

For each symbol you'll call, write one line:

```text
h: HtmlBuilder<Message> (view parameter, supplied by the runtime): { div, input (VOID), textarea, button, Class, Href, For, Id, Role, OnClick(Message), OnInput(value=>Message), OnBlur(Message), OnSubmit(Message), keyed, empty, submodel, ... }
Route.mapTo(schema)(parser): curried
pushUrl(path): Effect<void>  // NOT fallible, no Effect.ignore needed
urlToString(url: Url): string
Update.Return<Model, Message>: { model: Model; commands?: ReadonlyArray<Command<Message>> }
Command.mapMessages(commands, toParentMessage): re-tag a child's Commands
AsyncData.Schema(DataSchema, ErrorSchema): { schema, Idle(), Loading(), Success({data}), Failure({error}), ... }
AsyncData.match(value, { onIdle, onLoading, onRefreshing, onFailure, onStale, onSuccess })
  // handlers take BARE values, except onStale:
  //   onIdle: () => B          onLoading: () => B
  //   onRefreshing: (data) => B     onSuccess: (data) => B
  //   onFailure: (error) => B       onStale: ({ error, data }) => B
Command.define(name, { args, messages, execute }): every input is a named field.
  `execute` binds at DEFINITION and receives the decoded args object directly, so
  you destructure the fields themselves; the call site passes args:
  const Fetch = Command.define('Fetch', {
    args: { id: S.String },
    messages: [Ok, Err],
    execute: ({ id }) => ...,
  })
  update: [Fetch({ id })]     // NOT Fetch({ id })(effect)
Document: NOT generic, and `body` is a single Html, not an array
Input.view({ id, value, onInput, isInvalid?, type?, placeholder?, toView: (attrs) => Html }, h)
  // from '@foldkit/ui', NOT Ui.Input
  // attrs: { label: ReadonlyArray<Attribute<M>>, input: ..., description: ... }
Field (schema): NotValidated | Validating | Valid | Invalid(errors: NonEmpty<Rule Message>)
```

### Specific API pitfalls the generator hits repeatedly

Record these in the crib and keep them visible while generating:

- **`input` and `br` and other void elements take ONLY attributes**: `input([...])`, never `input([...], [])`. `textarea` and `button` DO take children.
- **The children argument is optional on every other element.** Omit it when there are none: `div([Class('divider')])`, not `div([Class('divider')], [])`. Attributes stay required, so `div([])` is how an element with neither is written. `keyed` is the same: `h.keyed('li')(key, [attrs])`, not `h.keyed('li')(key, [attrs], [])`.
- **`UrlRequest` tags are `Internal` and `External`**, not `InternalUrl` / `ExternalUrl`.
- **`OnClick` and `OnSubmit` take a Message directly**, not a `() => Message`. Only `OnInput` takes `(value) => Message` because it needs the input value.
- **`keyed`, `empty` are properties on the builder `h`** the view receives as its last parameter. They are not top-level exports of `foldkit/html`.
- **Attribute helpers are specific**: `Value(...)`, `Type(...)`, `Placeholder(...)`, `Href(...)`, `Target(...)`, `Rel(...)`, `Rows(n)`, `Id(...)`, `For(...)`, `Role(...)`, `AriaLabel(...)`. There is no generic `Attr('...', '...')`.
- **`ApplicationInit<Model, Message, Flags>` has no URL parameter.** For routed apps, use `RoutingApplicationInit<Model, Message, Flags>`: the second arg is `url: Url`.
- **`Route.mapTo` takes the route schema, not a factory function.** `pipe(literal('new'), Route.mapTo(NewLinkRoute))`. NOT `Route.mapTo(() => NewLinkRoute())`.
- **`Effect.ignore` is ONLY for fallible Effects.** `pushUrl(path).pipe(Effect.as(Message()))`. No `Effect.ignore` because `pushUrl` returns `Effect<void>`.
- **`Command.define` takes a config object with a `messages` array**: `Command.define('Fetch', { messages: [Message.SucceededFetch, Message.FailedFetch], execute })`. `messages` is required and is always an array, even for one Message: `Command.define('ReadClock', { messages: [Message.RecordedTime], execute })`.
- **`makeRules` takes `{ required?: Rule.RuleMessage, rules: Array<Rule.Rule> }` where `Rule.Rule = [Predicate, Rule.RuleMessage]`**: a tuple, NOT `{ test, message }`. Rule constructors live on the `Rule` namespace (`Rule.url({ message })`, `Rule.email(message?)`, `Rule.minLength(n, message?)`, `Rule.pattern(regex, message?)`, `Rule.fromSchema(schema, message)`).
- **`Field.Invalid` has `errors: NonEmptyArray<string>`, not `error: string`.** Use `Array.headNonEmpty(errors)` to get the first message; use `Rule.resolveMessage(message, value)` to resolve a rule message to its final string.
- **Route variants are `HomeRoute`, `NewLinkRoute`, etc., with the `Route` suffix.** Every exemplar uses this convention.
- **Routers are callable for printing**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. Never hand-construct URLs.
- **UI components come from `@foldkit/ui`, not from a `Ui` namespace on `foldkit`.** `import { Dialog, Input } from '@foldkit/ui'`, then `Dialog.view(...)`. There is no `Ui` export on the `foldkit` package.
- **`HttpClient` and `HttpClientRequest` come from `effect/unstable/http`**, not `@effect/platform`. Provide the client to the Command's Effect with `Effect.provide(effect, Http.layer)`, where `Http` is imported from `foldkit`. `@effect/platform-browser` is a different thing, used for `BrowserKeyValueStore` and `BrowserCrypto`.
- **Map a child Submodel's Commands with `Command.mapMessages(childCommands, message => Message.GotChildMessage({ message }))`.** Not `Command.mapEffect`.
- **Name the update return type once per file**, and prefer `Update.Return<Model, Message>` from `foldkit/update` for the alias. A hand-written plain-return alias is equivalent only when it includes the load-bearing `outMessage?: never` guard. Pass the alias to `Message.match<UpdateReturn>` and omit a redundant `: UpdateReturn` annotation from update. Use `M.withReturnType<UpdateReturn>()` only for an Effect `Match` over a different tagged union inside a handler.
- **Branch on a Model array with `Array.match`, not the predicates.** `Array.isArrayEmpty` and `Array.isArrayNonEmpty` (note the names: not `isEmptyArray` / `isNonEmptyArray`) take a mutable `Array<A>`, so neither compiles against the `ReadonlyArray` an `S.Array(...)` field decodes to. `Array.match` takes `ReadonlyArray` and is what the exemplars use.
- **`empty` and `keyed` are properties on `h`**, so they are never in the `foldkit/html` import list. Import the types (`import type { Document, Html, HtmlBuilder } from 'foldkit/html'`) and reach for `h.empty` / `h.keyed` off the view's builder.

## Phase 4: Generate the App

Generate files following the architecture and conventions guides exactly. Write all source files into the scaffolded project's `src/` directory. For each file, follow these rules:

### Model

- Define as `S.Struct` with Effect Schema types
- Use discriminated unions for state: `Idle | Loading | Error | Ok`, never booleans for multi-valued state
- Use `Option` for fields that may be absent. Never empty strings or null
- Prefix Option-typed fields with `maybe`: `maybeCurrentUser`, `maybeError`
- For remote data, use the `AsyncData` module rather than hand-rolling a union. `AsyncData.Schema(WeatherData, S.String)` returns `{ schema, Idle, Loading, Refreshing, Failure, Stale, Success }`; put `schema` in the Model and build values with the constructors. The `Refreshing` and `Stale` states are the point: they let a reload keep the current data on screen, and a failed reload keep it rather than discarding it. `repos/foldkit/examples/weather/src/main.ts` is the canonical use. Read `AsyncData.match`'s signature before calling it: the handlers take bare values (`onSuccess: data => ...`, `onFailure: error => ...`), except `onStale`, which takes `{ error, data }`
- For non-remote multi-valued state (form steps, editor modes, connection phases), define variants with `ts()` and compose into an `S.Union`. See Discriminated Unions for State in [conventions.md](conventions.md)
- For apps with multiple domain entities referenced across modules, extract shared schemas into `src/domain/` (e.g., `domain/product.ts`, `domain/session.ts`). See the shopping-cart and auth examples for this pattern, and read `${CLAUDE_SKILL_DIR}/../../packages/website/src/page/projectOrganization.ts` for guidance on when and how to structure domain modules

### Messages

Declare the Message union and its type together:

```ts
export const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: S.String },
  SucceededLogin: { user: User },
  FailedLogin: { error: S.String },
  CompletedFocusInput: {},
})
export type Message = typeof Message.Type
```

Keep the `defineMessageUnion()` declaration and `type Message` alias adjacent. Construct variants through the namespace, such as `Message.ClickedSubmit()` and `Message.UpdatedEmail({ value })`. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Prettier wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Name messages by category:

- `Clicked*`: button/link clicks
- `Updated*`: input value changes (with `{ value: S.String }`) and external state updates from subscriptions (`UpdatedRoom`, `UpdatedPlayerProgress`)
- `Submitted*`: form submissions
- `Succeeded*` / `Failed*`: paired, for commands that can meaningfully fail
- `Completed*`: every other Command result, named from the Command (verb+object: `CompletedFocusInput`, `CompletedGenerateCardId`)
- `Got*`: child module results via OutMessage pattern
- `Pressed*`: keyboard input
- `Blurred*`: focus loss
- `Selected*`: choice made from a list
- `Toggled*`: binary state flip

Every message must carry meaning. No `NoOp`.

### Flags (if the initial Model needs side effects)

- Define a `Flags` Schema for data the initial Model needs from side effects
- Define `flags` as an `Effect<Flags>` that computes the values (localStorage reads, current time, etc.)
- Pass `flags` to `Runtime.run(application, { flags })` for a fresh browser boot. Hydrated applications call `Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })` and use only the server-encoded Flags payload
- Pass the result into init. Never perform side effects at module level or inside init directly
- See the Flags section in [architecture.md](architecture.md) for the full pattern

### Init

- Return `{ model, commands? }`. Omit `commands` when there are none
- If Flags are used, accept them as the first parameter. For example: `(flags: Flags) => ({ model: initialModel(flags) })` or `(flags: Flags, url: Url) => ({ model: initialModel(flags, url) })`
- Include startup Commands (initial fetch, focus first input, etc.)
- Use callable Schema constructors for the initial Model: `Model({ field: value })`

### Update

- Name the return type once per file from the framework's alias:

  ```ts
  type UpdateReturn = Update.Return<Model, Message>
  ```

  `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is the Submodel counterpart. Prefer the framework aliases. A hand-written plain-return alias is equivalent only when it includes `outMessage?: never`.

- Use `Message.match<UpdateReturn>(message, {...})`. Never switch. Keep Effect `Match` for other tagged unions, partial matches with fallbacks, and handlers shared across several tags
- Use `evo(model, { field: () => newValue })` for immutable updates
- When a `Succeeded*` handler has to write several caches and kick off refetches, sequence them with `Update.combine(model, [step, step, ...])` and build the refetch steps with `Update.refresh({ read, revalidate, write, load })`, which reloads a cache only when it actually holds data. `examples/route-transitions/src/main.ts` shows both
- In `evo`, use point-free field transformers when the update only depends on that field's current value: `items: Array.map(updateItem)`, `count: Number.increment`, `priceSlider: Slider.reflectRange({ min: minPrice, max: maxPrice })`. Use `() => value` for replacement values from Messages, child updates, Commands, or other Model fields.
- Extract complex handlers to separate functions when a case exceeds ~15 lines
- For Submodels, return `{ model, commands?, outMessage? }`. Omit `outMessage` when there is nothing to report
- See the OutMessage pattern in [architecture.md](architecture.md). Child modules signal to parents through `outMessage`; parents handle the value through `foldOutMessage` on `Update.foldChild`

### Commands

- Define Command identities with `Command.define`, whose second argument is a config object: `args` (optional) declares the args Schema, `messages` lists every Message the Command can produce, and `execute` holds the Effect. With args the shape is `Command.define('Fetch', { args: { id: S.String }, messages: [Message.SucceededFetch, Message.FailedFetch], execute: ({ id }) => Effect })`: `execute` binds at definition and receives the args, and the update returns `Fetch({ id })`
- To make a Command interruptible, add `interrupt`. `interrupt: true` keys every invocation by the Command name; `interrupt: { keyFields, toKey }` selects the args that identify an invocation and derives its key so concurrent invocations can be cancelled independently. The selected fields become the args required by the Definition's `Interrupt` constructor
- Always assign definitions to PascalCase constants. Never inline in pipe chains
- Definitions live where they're produced, colocated with the update function
- Let TypeScript infer return types. No explicit `Command<typeof A>` annotations
- Use `Effect.gen` for multi-step async
- Always `Effect.catch(() => Effect.succeed(Message.FailedX(...)))` for fallible Effects. Commands never throw. **Exception:** if the Effect is infallible at the type level (`Clock.currentTimeMillis`, `Effect.uuid`, `Random.nextIntBetween`, etc.), no `catch` is needed and no `Failed*` Message is needed. Follow the types: if there's no error channel, there's nothing to catch.
- Use `Effect.provide` for services
- Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- Name each Command for the effect its `execute` body performs, not the later Model transition caused when update handles its result. A timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`
- Commands that can't meaningfully fail return `Completed*` Messages named from the Command, payload-carrying ones included: `DetermineStartTime` → `CompletedDetermineStartTime`, not `DeterminedStartTime`
- Use Foldkit's `Dom` module for DOM operations (`Dom.focus`, `Dom.scrollIntoView`, `Dom.showDialog`, `Dom.lockScroll`, etc.) and Effect built-ins for everything else (`Clock.currentTimeMillis`, `Random.nextIntBetween`, `Effect.uuid`, `Effect.sleep(Duration.millis(...))`). See DOM and Effect Helpers in [architecture.md](architecture.md)
- For HTTP requests, use `HttpClient` and `HttpClientRequest` from `effect/unstable/http`, and provide the client with `Effect.provide(effect, Http.layer)` where `Http` comes from `foldkit`. See `examples/weather/src/main.ts` for the pattern
- To re-tag a child Submodel's Commands for the parent, use `Command.mapMessages(childCommands, message => Message.GotChildMessage({ message }))`

### Form Validation

When the app has form inputs that need validation (required fields, format checks, async uniqueness checks), use `foldkit/fieldValidation`. Do not hand-roll validation state.

```ts
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  Valid,
  Validating,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'

const nameRules = makeRules({
  rules: [Rule.minLength(2, 'Name must be at least 2 characters')],
})

const emailRules = makeRules({
  required: 'Email is required',
  rules: [Rule.email('Please enter a valid email address')],
})

const Model = S.Struct({
  name: Field(S.String),
  email: Field(S.String),
  // ...
})
```

`Field(valueSchema)` builds a tagged union: `NotValidated | Validating | Valid | Invalid`. The value Schema should match what the control actually holds as the user edits, not the type you parse it into: `Field(S.String)` for text inputs, `Field(S.Array(S.String))` for a multi-select. A checkbox's boolean usually stays plain `S.Boolean` in the Model unless it needs the validation lifecycle. Rules stay separate in `makeRules`. Use `validate(rules)(value)` in update handlers to transition a field, and gate submission with `allValid([[state, rules], ...])`, which gates one field value type per call (combine calls with `&&` across types). Omit `required` from `makeRules` to make a field optional.

Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts` (async email uniqueness check with version-based cancellation) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/` (validated multi-step forms across submodels).

### Dates and File Uploads

For date handling (birthday, deadlines, scheduling):

- Use the `Calendar` module: `Calendar.CalendarDate`, `Calendar.today.local` (Effect returning today's date in the user's timezone), `Calendar.make(year, month, day)`, `Calendar.addDays`, etc.
- Use `DatePicker` (input + popover calendar) or `Calendar` (inline grid) from `@foldkit/ui` for the UI
- Seed the initial date via Flags when needed. See `job-application` example, which uses `Calendar.today.local` in its Flags Effect

For file uploads (resumes, images, attachments):

- Use the `File` module for file primitives
- Use `FileDrop` from `@foldkit/ui` for a drag-and-drop + click-to-browse zone with validation
- `FileDrop.ReceivedFiles` carries `files: NonEmptyArray<File>`, so the happy path never has to handle an empty list. A drop that produced no files arrives as the separate `RejectedNonFiles` OutMessage; handle it to surface a message like "Only files are accepted"
- Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/attachments.ts`

### View

- Every view receives `h`, the typed Html builder, as its last parameter: the runtime passes it to the root view, and `Submodel.defineView<Model, Message>` passes the child's own to each Submodel view. Application code never constructs a builder. Reach for elements, attributes, and event handlers off `h`: `h.div`, `h.Class`, `h.OnClick`. The child dispatches in its own Message type and the parent declares the wrap at the embed site via `toParentMessage`.
- Extracted view helpers take `h: HtmlBuilder<Message>` as their last parameter; callers thread it through. Inside a view, always use the view's own `h`. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih` (typed `HtmlBuilder<never>`, so no handlers can be built with it).
- Use `h.Class(...)` for Tailwind classes
- Use `clsx` from the `clsx` package for conditional class composition: `h.Class(clsx('base-classes', { 'active-class': isActive, 'bg-blue-500': variant === 'Primary' }))`. Use `clsx` whenever classes depend on model state, boolean flags, or discriminated union tags. Never string concatenation, template literals, or `&&` expressions.
- Pattern match on model state: `M.value(model.state).pipe(M.tagsExhaustive({...}))`
- Use `Option.match` for conditional rendering based on Option fields
- Never key branches. View functions are the differ's identity boundaries; the vite plugin brands each function's return, so switching branches that render through different view functions replaces the subtree. Extract a same-tag inline ternary into named view functions when switching must reset DOM state
- Delegate complex sections to extracted view functions
- Wire events to Messages: `h.OnClick(Message.ClickedSubmit())` (a Message directly, not a callback), `h.OnInput(value => Message.UpdatedEmail({ value }))` (a callback that maps the value to a Message)
- Use Foldkit UI components when the interaction matches (Dialog for modals, Tabs for tabbed content, etc.)

### Runtime Wiring

- Use `Runtime.makeApplication` for apps that own the page. Add `routing: { onUrlRequest, onUrlChange }` for apps with URL routing. The `view` returns a `Document` (`{ title, lang?, dir?, canonical?, ogUrl?, body }`); the runtime applies `title`, the `lang` / `dir` attributes on `<html>`, and the canonical / og:url tags after every render
- Use `Runtime.makeElement` for a widget embedded on a page it does not own. The `view` returns `Html` and the runtime never touches the document `<head>` or the `<html>` element. No `routing` config
- See the With and Without URL Routing section in [architecture.md](architecture.md) for the full pattern
- Include `ClickedLink` and `ChangedUrl` Messages for programs with routing, with proper `InternalUrl`/`ExternalUrl` handling in update
- Always end with `Runtime.run(application)` for a page-owning app. When a host application controls the program's lifecycle, end with `Runtime.embed(element)` instead and hand the returned handle to the host; mirror `repos/foldkit/examples/embedding/src/host.ts` for the host side and its `main.ts` for the widget side
- Name the variable holding a `makeApplication` result `application`, and the variable holding a `makeElement` result `element`

### Routes (if multi-page)

- Use bidirectional parser: `r()`, `string()`, `int()`, `literal()`, `slash()`, `Route.mapTo()`, `Route.oneOf()`
- Define route schemas with `r('RouteName', { param: S.String })`
- **Suffix route variant constants with `Route`**: `HomeRoute`, `NewLinkRoute`, `NotFoundRoute`. Every exemplar (auth, shopping-cart, routing) does this. Disambiguates the route schema from views, models, or UI components with matching tag names.
- Build each route as a Router: `const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))`. **Routers are callable**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. This is the print side of the bidirectional parser.
- **Never hand-construct paths with template strings.** `Href(homeRouter())` not `Href('/')`. `pushUrl(newLinkRouter())` not `pushUrl('/new')`. `Href(tagFilterRouter({ tag: tagName }))` not ``Href(`/tag/${encodeURIComponent(tagName)}`)``. The router handles encoding and keeps the URL shape in one place so a refactor changes one file, not every call site.
- Render each route through its own view function; identity handles the switch, so route branches are never keyed. Key by entity id only when one shared view function renders different entities across route params (a detail page across slugs)
- Use `pushUrl` from `foldkit/navigation` in Commands for programmatic navigation. In the `ClickedLink` handler's `Internal` case, use `urlToString(url)` from `foldkit/url`. Never reconstruct the URL from `url.pathname + search + hash` manually; that path drops the `?` prefix and hash silently.
- In the `ClickedLink` handler, **don't pre-update `model.route`**. The runtime fires `ChangedUrl` after `pushUrl` resolves, which updates the route. Pre-updating creates a double-write.

### Subscriptions (if real-time)

- Define with `Subscription.make<Model, Message>()(entry => ({ key: entry(fields, callbacks) }))`. The builder callback receives an `entry(fields, callbacks)` helper. `fields` is the bare field map (no `S.Struct` wrap), `callbacks` carries `modelToDependencies`, `dependenciesToStream`, and optional `equivalence`
- `modelToDependencies` extracts Subscription parameters from Model
- `dependenciesToStream` builds `Stream<Message>` from dependencies
- Subscriptions auto-start/stop based on Model state. Never manually managed
- For Subscriptions with no Model dependencies (always active), pass `{}` as the `entry` fields argument and return `{}` from `modelToDependencies`
- To embed child Subscriptions, use `Subscription.lift(childRecord)<Parent, Parent>({ toChildModel, toParentMessage })`. Add `when` on the parent's lift call to gate on a parent fact the child cannot see (the route a page Submodel sits behind); the parent owns the gate and reads the parent Model, and a closed gate tears the entry's Stream down. `when: parentModel => boolean` gates every entry; `when: { entryName: parentModel => boolean }` gates only the entries it names, so a child never splits its record to suit its parent's gating. To combine multiple records, use `Subscription.aggregate<Model, Message>()(...records)`

### Managed Resources (if stateful runtime handles)

- Define with `ManagedResource.make<Model, Message>()(entry => ({ key: entry(requirementsSchema, config) }))`. `requirementsSchema` is the positional first argument (usually `S.Option(...)`); `config` carries the `resource` tag, `modelToMaybeRequirements`, the `acquire`/`release` Effects, and the `onAcquired`/`onReleased`/`onAcquireError` Messages
- `modelToMaybeRequirements` returns `Option.some(params)` to acquire (or re-acquire when params change) and `Option.none()` to release. Resources auto-acquire/release on Model state, like Subscriptions
- For a resource with no params, use `S.Option(S.Null)` and return `Option.some(null)`
- Read the service union with `ManagedResource.ServicesOf<typeof managedResources>`
- To embed a child Submodel's resources, use `ManagedResource.lift(childRecord)<Parent, Parent>({ toChildModel, toParentMessage })` (its `toChildModel` returns `Option<ChildModel>`, so lifted requirements must be `S.Option`-wrapped). Combine records with `ManagedResource.aggregate<Model, Message>()(...records)`
- App-lifetime handles go in `resources`, not here; there is no `persistent`

## Phase 4.5: Self-check before verification

Before running `tsc` or opening the browser, do a quick mechanical pass over the generated files. The reviewer in Phase 6 catches these, but catching them at write-time is cheaper than catching them after a full review round. Skip this and you inflate round-1 review noise with preventable items.

**Run the lint script first, then the "Mechanical scans" block in `checklist.md`** against `src/`. The scaffold wires `@foldkit/oxlint-plugin`, whose rules are the structural check: keyed rows, route printing, empty-object tagged calls, `Rel` on external links, spread inside `evo`, `Got*` wrapping, Command naming. Treat every `foldkit(...)` diagnostic as a blocker; that is how the rules are labelled in the output. The greps then cover ground no rule touches (API drift, `@foldkit/ui` adoption, Effect idiom, unpaired labels, `maybe*` on non-Option, `span([])` placeholders, redundant `Effect.ignore`, focus-outline resets) plus the deliberate edges of rules that are narrow: empty-object calls through a namespace, `_blank` inside a spread attribute array, mapped rows keyed on something other than `.id`, a spread in the `evo` updates object itself, and `as` casts on constructor returns, which only the scaffold's oxlint config rejects. A green lint does not clear those. Each hit is either a fix or a `// NOTE:` justification.

Then eyeball each file you wrote:

- **Every file's imports**: do you actually use every symbol? (Lint catches this, but catching it here avoids a lint round later.)
- **Every Message in the Union**: does update have a case for it? Does the view dispatch it?
- **Every state variant**: is it ever entered? Does the view render something different when it's active?
- **Every Command**: is it tested? Does its `Succeeded*` or `Completed*` Message have a handler in update?

This is ~2 minutes of reading per file. It saves ~15 minutes of review loop per unresolved item.

## Phase 5: Verify and Test

### Gate: four commands must succeed before declaring Phase 5 complete

Before moving to Phase 6, run ALL FOUR of these and fix everything they surface. Not one, not three. All four:

```bash
npm run format      # run FIRST: rewrites files
npm run lint
npm run typecheck
npm run test
```

Use whichever package manager the project was scaffolded with: `npm run`, `pnpm run`, `yarn`, or `bun run`. If a script is missing, run the project-local binary through that manager's exec (`pnpm exec prettier -w .`, `npm exec --no-install prettier -w .`, `yarn exec prettier -w .`, `bun x --no-install prettier -w .`). Avoid bare `npx`, which fetches and runs a package from the registry when the binary isn't installed locally.

Run **format first** because it rewrites files; running it last would leave tsc/test passing against unformatted code that a pre-commit hook would then reformat, creating a diff the user has to clean up. Running it first means lint/typecheck/test verify the exact code that will be committed.

Each catches different classes of issue:

- **Format** rewrites spacing, indentation, trailing commas, and line wrapping to project style. Not a "check"; a normalizer. Generated code rarely matches Prettier's exact formatting by accident; without this step, every `git commit` produces a cascade of formatting-only diffs.
- **Lint** catches unused imports, unused variables, and style-rule violations. Easy to miss because generated code often imports a symbol "for completeness" that turns out not to be referenced (e.g. importing `NotValidated`, `Invalid` from fieldValidation when they're only used as string literals inside `M.tag` keys). `tsc` doesn't flag these.
- **Typecheck** catches API misuse, wrong parameter shapes, missing required props, and structural type errors. Doesn't catch unused imports.
- **Tests** catch behavioral regressions. Don't catch either of the above.

If the project doesn't have a format/lint script, check `package.json` and run the binaries through your package manager's exec (`pnpm exec prettier -w .` / `pnpm exec oxlint src`, or the npm / yarn / bun equivalent) directly. Don't skip either because "there's no script". The scaffolded `create-foldkit-app` project always ships both configured.

Fix ALL output from all four before declaring Phase 5 done. "Typecheck clean and tests pass" is insufficient. Unformatted code with unused imports is not at the bar.

### Type errors first

Then generate tests using `foldkit/test`. There are two test styles. Name each test file for its style, beside the code under test: `story.test.ts` for Story tests (the state machine, driving `update`) and `scene.test.ts` for Scene tests (the rendered view). The name describes how the test works, not a source file, so it holds whether `update` and `view` live in `main.ts` or their own files. When a folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`. Scene runs at any level: `Submodel.defineView` produces a plain `(model, h) => Html`, so a page's view drops into `scene` unmodified, and a Submodel declaring `ViewInputs` takes a second argument the test supplies through `withViewInputs(view, defaults)`, whose returned factory takes per-test overrides for everything except `toView`. A page-level Scene asserts the OutMessage a Submodel emits with `expectOutMessage` / `expectNoOutMessage`, and drives Messages from the non-view lifecycle causes with cause-named steps: `Subscription.emit` (only when the Message has no DOM affordance; click the actual button when it does), `ManagedResource.acquire` / `release` / `failAcquire` (gated on the entry's `modelToMaybeRequirements`, so drive the Model transition first), and `CustomElement.emit` (typed by the spec's event Schemas). An interaction whose handler returns `Option.none()` lets the event fall through, and Scene requires that be stated: follow it with `expectIgnored()`, or Scene fails at the next interaction or the end of the scene. Use `expectHandled()` where the event should have been consumed, which is the assertion behind a key being consumed so the browser default is prevented. Put a `scene.test.ts` in the page folder for behavior that page owns, and keep a root-level `scene.test.ts` for flows that cross pages, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`: `import { Command, given, message, model, story } from 'foldkit/story'`. A test file needs only one of the two modules, so this keeps call sites short. In the rare case a single file tests both a story and a scene, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

**Story tests** (`story.test.ts`) test the update function directly. You send Messages and assert on the Model and Commands. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/weather/src/story.test.ts`: simple Command resolution (happy path + error path)
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/page/login.story.test.ts`: Submodel with OutMessage assertions, field validation
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/search/story.test.ts`: multi-step interactions (arrow key cycling, stale result handling)

Write `story` pipelines covering:

- **Happy path**: the primary user flow from start to finish
- **Error path**: every fallible Command resolved with its `Failed*` Message
- **Multi-step interaction**: at least one test that chains multiple Messages and Command resolutions
- **Edge cases**: empty states, boundary conditions, ignored inputs (e.g. stale results, duplicate submissions)

**Scene tests** (`scene.test.ts`) test through the rendered view. You interact with elements by accessible locators (role, label, text) and assert on what the user sees. A `scene.test.ts` is **REQUIRED** for Tier 3+ apps. The review loop treats its absence as a BLOCKER, not a QUALITY item. No exceptions. Don't "defer" this. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/weather/src/scene.test.ts`: basic Scene flow with form interaction and Command resolution
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/scene.test.ts`: a multi-page app's root-level Scene driving the login flow through the root view
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/page/login.scene.test.ts`: a page-scoped Scene in that same app, driving the page's own `update`/`view` rather than the root pair
- `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/scene.test.ts`: scoped queries with `within`, `toHaveValue`, explicit test data

Write `scene` pipelines covering:

- **View rendering**: initial view has expected elements (headings, inputs, buttons)
- **User interactions**: click, type, submit produce visible changes
- **Loading states**: submitting shows loading indicator
- **Error states**: failed Commands show error messages in the view
- **Scoped queries**: use `within(parent, child)` to compose a single scoped Locator (good for one-off scoped assertions or reusable named locators). Use `inside(parent, ...steps)` to scope a whole block of steps to the same parent. Every Locator referenced by the nested steps resolves within the parent's subtree. Reach for `inside` when two or more steps share a scope; reach for `within` for single-use scoping.
- Prefer accessible locators: `label(...)`, `role(...)`, `text(...)` over `placeholder(...)` or CSS selectors

Run the project's test script (`npm run test`, or your package manager's equivalent) to verify tests pass.

Then run through the [verification checklist](checklist.md) to catch structural gaps. Fix any remaining issues before moving on.

## Phase 5.5: Visual and a11y verification

Code review and automated tests don't catch rendering bugs or accessibility gaps. Two things to do before Phase 6:

### Visual check

Start the dev server (`npm run dev`) and open the app in a browser. Click through every route. Interact with every form. Watch for:

- Inputs with missing backgrounds (Tailwind preflight strips the browser-default white; `bg-white` must be explicit on every raw `input` or `textarea`, meaning every one you don't route through `Input` or `Textarea` from `@foldkit/ui`)
- Text that's too dim or too small to read
- Overlapping elements, broken spacing, layout shifts
- Cursor/hover states that don't feel right
- Focus rings that are invisible or missing on interactive elements

Many visual bugs are invisible to typecheck, tests, and code review. The only tools that catch them are (1) looking at the rendered output and (2) using `@foldkit/ui` components that already bake sensible defaults in.

If the app has UI, **don't claim Phase 5 complete until you've loaded the app and clicked through it.** If you can't run a browser in your environment, say so explicitly in the final report rather than skipping the check silently.

### A11y check

Walk the **Accessibility** and **Foldkit UI** sections of `checklist.md`. Both have mechanical grep commands. Run them against `src/`. Don't re-list them here; the checklist is the canonical reference for these greps, and duplicating them across files invites drift.

A11y items are not "nice-to-have". They're correctness for a non-visual user.

## Phase 6: Subagent Review Loop

Self-review is weaker than fresh-eyes review. After Phase 5 passes, spin up subagents to review the generated code against the quality bar, and iterate until they sign off.

### Loop mechanics

Run up to **three rounds**. Each round:

1. Spawn a review subagent using the `Agent` tool with `subagent_type: general-purpose`.
2. Read the subagent's response.
3. If response is `PASS`, exit the loop and proceed to Phase 7.
4. If response contains `BLOCKERS` or `QUALITY` items, fix each, then loop.
5. `NICE-TO-HAVE` items can be deferred to Phase 7's future-work list if the round budget is exhausted.

After round 3, if issues remain, exit the loop and carry the unresolved items into Phase 7 as "known polish areas". Do not silently ship flagged code. Be explicit about what's still open.

### Review subagent prompt

Use a prompt of roughly this shape. Tailor only the file list and project path. Keep the rubric, output format, blind-spots checklist, and bar-setting instructions intact.

```text
You are reviewing a freshly generated Foldkit program. The bar is:
this code should be indistinguishable in quality from hand-written
code in `packages/typing-game/client/src/` or `packages/website/src/`.
Not "works." Not "structurally valid." Typing-game quality.

Read FIRST, in this order:
1. The generated source files, project-relative: list every one
   (src/main.ts, src/update.ts, ...).
2. ${CLAUDE_SKILL_DIR}/architecture.md
3. ${CLAUDE_SKILL_DIR}/conventions.md
4. ${CLAUDE_SKILL_DIR}/checklist.md
5. ${CLAUDE_SKILL_DIR}/blindSpots.md
6. At least one exemplar file matching the generated app's complexity,
   from the foldkit repo (vendored at repos/foldkit/ when the project
   has the subtree):
   - Tier 1-2: packages/foldkit/src/runtime/runtime.ts (quality calibration)
   - Tier 3-4: examples/weather/src/main.ts OR examples/form/src/main.ts
   - Tier 5: examples/kanban/src/update.ts AND examples/kanban/src/domain/
   - Tier 6: examples/job-application/src/update.ts AND examples/auth/src/page/
   - Tier 7: packages/typing-game/client/src/page/room/

Every path above is either project-relative or resolved through
${CLAUDE_SKILL_DIR}, the same way the rest of this skill refers to its
own files. Do not rewrite them as absolute paths. An absolute path is
machine-specific, and hand-pasting one is what made an earlier version
of this prompt unusable anywhere but the machine it was written on.

Then walk the entire checklist.md against the generated code. Every item.
Then walk every entry in blindSpots.md and report one line per entry:
`<slug>: clean | flagged at <file:line>: <issue>`. Silence is not a pass.
Also read at least one of the generated files side-by-side with the
exemplar you chose. Ask: does this look like it was written by the
same hand?

Output format. Exactly this structure:

## BLOCKERS
Items that are structurally wrong, logically buggy, or violate
conventions. Must fix.
Each item: `path/to/file.ts:line: what's wrong; what to fix`.
If none: write `None.`

## QUALITY
Items that work but fall short of the bar: generic naming, inline
handlers that should be extracted, missing domain/ directory,
native methods instead of Effect modules in pipes, views that
should be decomposed, etc. These should be fixed.
Each item: `path/to/file.ts:line: the gap; the idiomatic version`.
Cite the exemplar when possible: "typing-game does this as X at
page/home/update/handleKeyPressed.ts:33-40".
If none: write `None.`

## NICE-TO-HAVE
Polish items that would push quality further but aren't required:
additional tests, slightly better names, minor refactors.
If none: write `None.`

## VERDICT
One of:
- `PASS`: the code is at the bar. Ship it.
- `NEEDS-WORK`: there are BLOCKERS or QUALITY items to address.

Do NOT write code. Review only. Be specific, be brutal, don't grade on
a curve. If you're unsure whether something is at the bar, compare it
to the exemplar. If the exemplar wouldn't write it that way, flag it.

Before finishing, confirm the generator ran all four gates (format,
lint, typecheck, test) and showed the output of each. If it claims
Phase 5 complete but a gate's output wasn't shown, flag it as a
BLOCKER naming the gate: "Run `npm run lint`: unverified." Lint
catches unused imports that tsc does not, and those leak into review
as noise.
```

### After the loop

- If verdict is `PASS` on any round → proceed to Phase 7, no caveats.
- If verdict is `NEEDS-WORK` after round 3 → proceed to Phase 7 but list the outstanding `BLOCKERS` and `QUALITY` items in the Explain output under "Known polish areas." The user should see them.

### Between rounds: actually fix, don't just acknowledge

Between rounds, the generator MUST actually apply fixes for every BLOCKER and every QUALITY item the reviewer flagged. Do not carry forward items with "I'll note this" or "deferring" unless the round budget is exhausted. A QUALITY item the reviewer flagged in round N that's still present in round N+1 is a process failure. It means the generator read the review and then didn't act.

Common failure mode: the reviewer flags `.length > 0` checks as QUALITY and notes `Array.match`/`String.isNonEmpty` as the fix. The generator moves to other fixes, the round 2 review flags the same thing again, and nothing happens because "round 2 is clean on BLOCKERS so we're good." It isn't good. Untriaged QUALITY items become silently-shipped rot.

Before running round N+1, produce a short written diff between "what round N flagged" and "what I changed." If the lists don't match, go back and fix the gap before running round N+1.

## Phase 7: Explain

After generating the program (and passing review), walk the user through what was built:

1. **Files generated**: list each file with a one-line description of what it contains and why it exists as a separate file (or why everything is in one file)
2. **Architecture decisions**: explain key modeling choices, for example: which discriminated unions were used and why, which Foldkit UI components were integrated, why Flags were or weren't needed, any domain extraction decisions, etc.
3. **Review outcome**: state how many review rounds ran and the final verdict. If `PASS`, say so. If `NEEDS-WORK` after round 3, list the outstanding items verbatim under "Known polish areas" so the user knows what the reviewer flagged that didn't get fixed.
4. **How to run**: remind the user to start the dev server and what they should see
5. **How to extend**: give concrete next steps: "to add bookmark editing, define `ClickedEditBookmark` and `UpdatedEditTitle` Messages, add an `Editing` variant to the Model, and handle both in update"
6. **When to restructure**: mention signals that the program has outgrown its current file organization (e.g., "if update exceeds ~20 cases, consider extracting a Submodel")
