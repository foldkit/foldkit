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
4. **Real-time needs**: streaming data that becomes a `stream` or `subscriptions` entry (e.g., "live updates", "countdown", "WebSocket")
5. **Pages/navigation**: URL structure that becomes routes (e.g., "home page", "detail page")
6. **UI component needs**: interactive widgets that map to Foldkit UI components (e.g., "dropdown" → Menu, "modal" → Dialog, "tabs" → Tabs, "autocomplete" → Combobox, "date picker" → DatePicker, "file upload" → FileDrop, "reorderable list" → DragAndDrop, "toast/notification" → Toast, "hover tooltip" → Tooltip, "range/price filter" → Slider, "long scrolling list" → VirtualList)
7. **Form validation needs**: required fields, format checks, async uniqueness → `foldkit/fieldValidation` module (see Phase 4)
8. **Date handling**: birthdays, deadlines, scheduling → `Calendar` module + `DatePicker` or `Calendar` from `@foldkit/ui`
9. **File handling**: uploads, attachments, images → `File` module + `FileDrop` from `@foldkit/ui`
10. **Remote data**: anything fetched, cached, refreshed, or revalidated → the `AsyncData` module (see Phase 4). Don't hand-roll a loading/error union
11. **Feature boundaries**: parts of the app that own their own interaction state, effects, or lifecycle (a page, an editor, a connection) → child Blocks held in the parent Model. Render-only pieces stay view functions
12. **Multi-state flows**: a described process that moves through several named steps with rules about which step follows which (checkout, onboarding, multi-step approval, a connection lifecycle) → consider experimental `Machine` from `foldkit/experimental/machine`. Writing transitions as a table lets `unreachableStates()` and `deadTransitions()` inspect reachability from `initial` and caller-supplied extra roots. Pass restored, deep-linked, and other externally entered states as extra roots before treating findings as defects. Present it as experimental and let the user choose. For a flow with only two or three states, use `defineTaggedUnion` and one `match`. `repos/foldkit/examples/state-machine/` is the reference
13. **Host embedding**: the Program runs inside another app ("a widget in our React app", "embed this in an existing page", "the host needs to control it") → `Program.makeElement(Application, { layer, container, ... })` plus the `Runtime.embed` lifecycle handle, with Flags for initial data and Ports for ongoing communication in both directions. `repos/foldkit/examples/embedding/` is the reference

Present this analysis to the user before proceeding.

If the description is detailed and unambiguous, summarize the analysis and confirm before moving on. If there are gaps (unclear state transitions, vague UI requirements, unspecified error handling, missing edge cases, ambiguous domain boundaries, unclear counter/reset semantics), ask targeted clarifying questions. Don't ask open-ended questions like "anything else?". Ask about the specific gaps you found.

**UX/behavior gaps:**

- "Should the todo list persist across page reloads (localStorage), or start fresh each session?"
- "When the API call fails, should the app show an inline error or a dialog?"
- "You mentioned 'users can edit items'. Is that inline editing or a separate edit page?"

**Domain-logic gaps (easy to miss, expensive to fix):**

- "When the user skips an interval, does that count as 'completed' for purposes of the streak?"
- "Does a counter that tracks 'completed' increment on successful actions only, or on skipped actions too?"
- "If the user triggers a reset mid-flow, does the counter reset with it, or persist across resets?"
- "You mentioned 'after N events, trigger X'. Is that N events total, or N events since the last X?"
- "On the Nth action in a cycle, which action does it trigger, the cycle's first or last?"

Domain-logic questions often surface off-by-one bugs before they hit the code. If the description has any counter, cycle, streak, or "after N" phrase, ask about edge cases at 0, 1, and N specifically.

## Phase 2: Study Reference Examples

Read only the references that affect this program:

- The scaffolded project's `FOLDKIT.md`: the consumer conventions for the installed Foldkit version. It wins over these guides when they disagree
- [Architecture guide](architecture.md) for the TEA loop, Blocks, and the lifecycle primitives the requested behavior needs
- [Conventions guide](conventions.md) for naming, Schema, Effect, and update patterns
- [Block composition and Layers](../foldkit/references/composition.md) when the app has a child Block, a stateful Foldkit UI component, an OutMessage, a view input, an exposed handle, or Service Layers
- [Verification checklist](checklist.md) for the gates and quality bar
- [Blind spots](blindSpots.md) for the failure modes relevant to the planned behavior

Identify the program's architecture surfaces first, then read the matching sections and one current exemplar. These files are snapshots of a moving codebase. When they disagree with `repos/foldkit/` or the installed declarations, the installed version is right. Mention the disagreement in the final report so the skill can be repaired.

When an Effect API is uncertain, verify its current signature from the installed package or official Effect documentation instead of guessing.

### Quality exemplars

Two codebases are the _quality bar_ for generated apps, not just patterns to copy but the level of craft to match:

- `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/`: production multi-page app with one file per Block, OutMessage, handler and view decomposition inside a Block file, Streams, and domain modules.
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/`: production Foldkit website with page organization, shared view primitives, route-driven rendering, and domain separation.

Before generating, spot-check at least ONE file from each (how a Block's constructor and update record are laid out, how handlers get extracted, how domain files are structured) and match that level of craft. The generated code should be indistinguishable from hand-written exemplar code.

Then read the tier-specific example that matches the app's complexity. **Always read at least one tier-specific example.** Never generate from memory alone. File layouts inside examples move; list the directory before trusting a file name.

### Complexity tiers

**Tier 1: Single page, no async, minimal state:**
`${CLAUDE_SKILL_DIR}/../../examples/counter/src/application.ts`

**Tier 2: Timers, Subscriptions, simple stateful apps:**
`${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/application.ts` (a Model-gated `subscriptions` entry, Commands reading `Clock`) and `${CLAUDE_SKILL_DIR}/../../examples/todo/src/` (`application.ts`: CRUD with localStorage via Flags, with `Flags` and `flags` beside the Block)

**Tier 3: Async operations, loading/error states, API calls, form validation:**
`${CLAUDE_SKILL_DIR}/../../examples/weather/src/` (HTTP with `HttpClient`, request state transitions) and `${CLAUDE_SKILL_DIR}/../../examples/form/src/` (`foldkit/fieldValidation`; see Form Validation in Phase 4)

**Tier 4: URL routing, multiple pages, query parameters:**
`${CLAUDE_SKILL_DIR}/../../examples/routing/src/` (`application.ts`, `entry.ts`, `page/people/people.ts`: a page Block informed of route changes) and `${CLAUDE_SKILL_DIR}/../../examples/query-sync/src/`

**Tier 5: Complex state, nested domain models, CRUD, drag-and-drop:**
`${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/` (nested domain Schemas) and `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/` (`DragAndDrop`, Flags restoring from localStorage)

**Tier 6: Child Blocks, OutMessage, multi-step forms, auth flows, multi-module apps:**
`${CLAUDE_SKILL_DIR}/../../examples/auth/src/` (`application.ts` and `page/`: instances held in tagged Model variants, `.on` OutMessage handlers, protected routes) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/` (`step/`: nested Blocks with `DatePicker`, `FileDrop`, `Listbox`, and the `Calendar` module)

**Tier 7: Real-time, WebSocket, stateful handles, production-grade:**
`${CLAUDE_SKILL_DIR}/../../examples/websocket-chat/src/` (`chatSocket.ts`: a child Block that acquires a socket and exposes it; `application.ts`: parent Commands reading it with `use`), then `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/` and its `page/` directories.

Read the nearest tier-specific example plus any focused example for a primitive this app actually uses. Lower tiers are a lookup index, not a mandatory reading sequence.

## Phase 2.5: Identify Foldkit UI Component Opportunities

Foldkit ships accessible UI components that handle keyboard navigation, ARIA attributes, and focus management. They live in a **separate package**, `@foldkit/ui`, and are imported by name:

```ts
import { Button, Dialog, Input } from '@foldkit/ui'
```

There is no `Ui` namespace on the `foldkit` package.

Before generating, check whether any part of the app maps to a built-in component:

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

The package has two shapes.

**Stateful components are Block classes with a Live Layer.** An ordinary component exports its class under the component name and its Layer with a `Live` suffix: `Dialog.Dialog` and `Dialog.DialogLive`, `DatePicker.DatePicker` and `DatePicker.DatePickerLive`. A generic component exposes a factory that you call once at module scope; it returns a class with its Layer attached as `.Live`: `const ResultListbox = Listbox.makeBlock<Result>()`, then provide `ResultListbox.Live`. Stateful components include `Menu`, `Listbox`, `Combobox`, `Calendar`, `DatePicker`, `Dialog`, `Popover`, `RadioGroup`, `Tabs`, `Tooltip`, `FileDrop`, `DragAndDrop`, `Slider`, `VirtualList`, and `Toast` (through `Toast.makeBlock(PayloadSchema)`).

**Stateless render helpers** have no Model. Call `view` directly with a config and your own `h`, and keep the value in your own Model: `Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`.

Components have moved across that split before, so read the component's `public.d.ts`. A namespace exporting a class (or a `makeBlock` factory) is stateful. A namespace exporting only `view` and a config type is a render helper.

Using a stateful component is the same as using any child Block:

```ts
const dialog =
  yield *
  new Dialog.Dialog('confirmDelete', {
    id: 'confirm-delete',
  })

// model:   { confirmDelete: dialog, ... }    Model field Schema: Dialog.Dialog
// update:  messages: [model.confirmDelete.send(Dialog.Dialog.Message.RequestedOpen())]
//          ...dialog.on({ Closed: model => ({ model }) })
// view:    model.confirmDelete.view({ toView: attributes => ... })
// Layer:   Layer.provide(Dialog.DialogLive)
```

Old init configs are constructor args. Parent requests are Messages the parent sends (`RequestedOpen`, `RequestedClose`, `InformedOf*Change`). Slot callbacks such as `toView` are the view input passed to `model.x.view(...)`. A component that depends on another component provides it inside its own Layer (`DialogLive` already provides Animation), so provide only the components you construct. Check a component's `test` namespace for the Command definitions to resolve in tests (for example, `RadioGroup.test.FocusOption`).

**Always prefer Foldkit UI components over hand-rolling interactive widgets.** They make accessibility the default.

**For form inputs specifically:** every text input, textarea, and button in a form MUST go through `Input`, `Textarea`, and `Button`, even though raw `input`/`textarea` elements are available on `h`. The form example (`examples/form/src/`) defines field helpers that wrap `Input.view` and `Textarea.view` with label and validation feedback. Copy that helper pattern. Raw `input`/`textarea` are for non-form cases (search fields, inline editors) where you are intentionally working below the component layer, and even then, reach for the component first.

If the app uses UI components, read `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/` first (list the directory) for integration patterns, and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/` for `DatePicker`, `FileDrop`, `Listbox`, and `RadioGroup` used together in a real form.

## Phase 3: Determine File Organization

One file, one Block, at every scale. An app grows by adding Blocks, not by splitting them. FOLDKIT.md's "File organization" section is authoritative.

### What lives in which file

- **A Block file**, named for the Block in camelCase (`application.ts` for the root, `search.ts` for `Search`, `issueBoard.ts` for `IssueBoard`), holds everything that defines the Block, in this order: Message and OutMessage unions, Model Schema and the Schemas that are fields of it, Command and Mount definitions, the class, view helpers and the view, then the `Live` Layer with update handlers, Command and Mount handlers, `stream`, and `subscriptions`. Steps and pure helpers used by one Block stay in its file. A persistence Schema that a save Command encodes and `flags` decodes lives here too, beside the Command; it often looks like a subset of Model but it isn't part of Model.
- **`entry.ts`** builds the Program and starts the Runtime. **`entry.server.ts`** is the SSR/SSG entry.
- **`services.ts`** holds the root `ApplicationLayer` of ordinary Services and its test alternative `ApplicationTestLayer`.
- **`route.ts`** holds `ApplicationRoute` and the routers, once a page Block needs them as well as the root. A single routed root can keep them in `application.ts`.
- **`domain/*.ts`** holds domain entity Schemas and pure operations used by more than one Block. Import each module as a namespace: `import * as Link from './domain/link'`.
- **Tests and fixtures** sit beside the Block they test: `story.test.ts` and `scene.test.ts` for the root, `search.story.test.ts` and `search.scene.test.ts` beside `search.ts`.

Never split a Block across `message.ts`, `model.ts`, `update.ts`, `command.ts`, `view.ts`, `subscription.ts`, or `flags.ts`, and never add an `index.ts` barrel for a Block. A parent imports the class and its `Live` Layer from the child's file.

**Single Block** (Tier 1-3):

```
src/application.ts  ← Model, Message, Commands, Flags, Streams, view, Application, ApplicationLive
src/entry.ts        ← Program.make and Runtime.run
src/services.ts     ← ApplicationLayer, when ordinary Services are required
src/story.test.ts
src/scene.test.ts
```

**Several Blocks** (Tier 4-7):

```
src/application.ts       ← The root Block: Application and ApplicationLive
src/entry.ts
src/services.ts
src/route.ts             ← ApplicationRoute, shared by the root and page Blocks
src/newCardForm.ts       ← A child Block used by the root
src/page/
  home.ts                ← A page Block
  settings/              ← A page and the child Blocks only it uses
    settings.ts
    themePicker.ts
    settings.story.test.ts
src/domain/
  card.ts                ← Schemas and pure operations shared by several Blocks
  column.ts
```

When a Block grows too large to read in one file, extract a feature that owns its own state, effects, or lifecycle into a child Block in its own file. Do not slice the parent's responsibilities into sibling files. Render-only pieces stay view functions in the Block's file. Group a page with the child Blocks only it uses in a folder named for the page. Do not create empty files to mirror a layout.

Declare a Schema's decoded type on the next line, with the same name and no blank line: `const Foo = Schema.Struct(...)` followed by `type Foo = typeof Foo.Type`. Use `Foo` in decoded-value annotations and `typeof Foo` when an API needs the Schema type. Across a child boundary, derive aliases from the class: `type SearchMessage = typeof Search.Message.Type`.

## Phase 3.3: Architecture sketch (Tier 4+ only)

For Tier 4+ apps (routing, domain modules, multiple entities, child Blocks) produce a compact sketch BEFORE generating implementations. Tier 1-3 apps are small enough to generate in one pass; Tier 4+ apps burn a lot of effort if the structure is wrong.

The sketch has six parts. Emit them inline, get confirmation, THEN scaffold:

1. **File tree**: the exact paths you will create, matching Phase 3.
2. **Block tree**: every Block class, its constructor args, where its instances live in the parent Model (field, `Option`, array, Record, tagged variant), and its OutMessages.
3. **Model shape**: each Block's `Schema.Struct` fields and their types. Not the full Schema, just the shape.
4. **Message list**: every Message per Block, grouped by category (clicks, inputs, Command results, Messages a parent sends).
5. **Route list**: if routing, every `defineRouteUnion` variant with its params and the path it maps to.
6. **Domain operations**: for each file in `domain/`, the operations it will expose (`Link.byNewest`, `Link.filterByTag`, etc.).

Example for a Tier 4 link saver:

```
### Sketch

Files:
  src/application.ts, entry.ts, services.ts
  src/domain/link.ts
  src/story.test.ts, scene.test.ts

Blocks:
  Application (args { url }): root, no children

Model:
  route: ApplicationRoute
  links: ReadonlyArray<Link>
  newLinkForm: NewLinkForm (url: Field<string>, title/description/tagsInput: string, submitState)

Messages:
  Clicks: ClickedSaveLink, ClickedDeleteLink
  Inputs: UpdatedLinkUrl, UpdatedLinkTitle, UpdatedLinkDescription, UpdatedLinkTagsInput, BlurredLinkUrl
  Commands: SubmittedNewLinkForm, SucceededSaveLinks, FailedSaveLinks
  Routing: ClickedLink, ChangedUrl, CompletedNavigateInternal, CompletedLoadExternal
  Toggles: ToggledFavorite

Routes:
  ApplicationRoute.Home       → /
  ApplicationRoute.NewLink    → /new
  ApplicationRoute.TagFilter  → /tag/:tag
  ApplicationRoute.NotFound   → /* fallback

Domain:
  Link: schema + byNewest, filterByTag, toggleFavorite, remove, updateById
```

After emitting the sketch, ask the user to confirm or adjust. Don't scaffold or generate until they do. If they confirm, proceed. If they adjust, iterate on the sketch. Don't write code against a version they haven't approved.

This step is tempting to skip because the agent "knows what it's doing." Skip it and you ship a fully generated app that turns out to need structural changes. That's the expensive form of iteration. The sketch is the cheap form.

## Phase 3.5: Scaffold the Project

Before generating code, scaffold a runnable project using `create-foldkit-app`:

```bash
npx create-foldkit-app@latest
```

Run with no flags to drop into the interactive prompts; pick the counter example as the base (simplest starting point) and the user's preferred package manager. The generated project includes:

- `package.json` with all Foldkit and Effect dependencies, including `@effect/vitest`
- `vite.config.ts` with Tailwind and the Foldkit Vite plugin
- `tsconfig.json` with strict TypeScript settings
- `index.html` with the root container
- `src/styles.css` with Tailwind import
- `FOLDKIT.md` with Foldkit conventions, and an `AGENTS.md` stub pointing at it

### Offer the Foldkit subtree

After scaffolding, offer to vendor Foldkit in as a git subtree so future AI sessions can reference the full source, examples, and docs directly from the user's project. Commit the scaffold first so subtree has a base commit to merge into:

```bash
git init          # if not already a git repo
git add .
git commit -m "chore: initial commit"
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

The `foldkit@<version>` tag pins the subtree to the release the scaffold just installed, so the vendored source, examples, and docs match the APIs the app compiles against. Vendoring `main` instead can hand future sessions examples and APIs from a release the app has not installed. A canary install (`x.y.z-canary.<commit>`) has no tag; pin to the full hash of the commit its version names instead, which GitHub expands at `https://github.com/foldkit/foldkit/commit/<commit>`.

This is optional but strongly recommended. The scaffolded `AGENTS.md` includes a `subtree_prompted: false` line that agents check on future sessions. If the subtree is absent and this flag is false, the agent offers to add it. Handling it here means the user's next AI session already has full context. If the user declines, update the line to `subtree_prompted: true` so they aren't asked again.

To re-pin the subtree after a Foldkit package upgrade, run the same command with `pull` in place of `add`.

### Replace the scaffold

Then replace the counter example with the generated program, following the Phase 3 layout.

## Phase 3.7: Ground the Foldkit APIs

Before writing any code, READ the type signatures of every Foldkit module you will use. Each wrong guess is a tsc error, a re-read, an edit, another typecheck. Five minutes of reading prevents thirty minutes of iteration.

### The exact files to read

For each Foldkit module you plan to use, read the `.d.ts` at the paths below. Read the public surface; you don't need the internals. Write a short signature crib in your working notes.

```text
# Every app
<project>/node_modules/foldkit/dist/index.d.ts            # top-level re-exports: Block, Program, Runtime, Command, Mount, Dom, ...
<project>/node_modules/foldkit/dist/blocks/block.d.ts     # Block class factory, Implementation (constructor return), Result, InstanceMembers (view, send, on, use), Factory (each)
<project>/node_modules/foldkit/dist/blocks/program.d.ts   # Program.make / makeElement options: layer, container, routing, Flags, devTools
<project>/node_modules/foldkit/dist/blocks/public.d.ts    # `foldkit/block` types: Send, UpdateRecord, Instance, Resolved
<project>/node_modules/foldkit/dist/html/public.d.ts      # HtmlBuilder<Message>, element signatures, childAttributes, inertHtml
<project>/node_modules/foldkit/dist/message/public.d.ts   # defineMessageUnion()
<project>/node_modules/foldkit/dist/schema/public.d.ts    # defineTaggedUnion(), taggedStruct()
<project>/node_modules/foldkit/dist/struct/index.d.ts     # modifyFields(): check nested-update signature
<project>/node_modules/foldkit/dist/update/public.d.ts    # Update.combineSteps, Update.refresh, Update.withOutMessage
<project>/node_modules/foldkit/dist/command/public.d.ts   # Command.define({ args?, messages, interrupt? })
<project>/node_modules/foldkit/dist/blocks/testing.d.ts   # story(layer, args?, ...steps), scene(layer, args?, ...steps)

# If using routing
<project>/node_modules/foldkit/dist/route/public.d.ts       # defineRouteUnion, literal, slash, string, int, Route.root, Route.mapTo, Route.oneOf, Route.parseUrlWithFallback, Transition
<project>/node_modules/foldkit/dist/url/index.d.ts          # toString
<project>/node_modules/foldkit/dist/navigation/public.d.ts  # UrlRequest, pushUrl, replaceUrl, load: Effect<void> (no Effect.ignore needed)

# If using async / side effects
<project>/node_modules/foldkit/dist/asyncData/public.d.ts  # AsyncData: Idle/Loading/Refreshing/Failure/Stale/Success + Schema, match, isPending, hasData, revalidate
<project>/node_modules/foldkit/dist/http/public.d.ts       # Http.layer: provides HttpClient in ApplicationLayer
<project>/node_modules/foldkit/dist/dom/public.d.ts        # focus, advanceFocus, scrollIntoView, showDialog, closeDialog, lockScroll, streamFromKeyBindings, animationFrameTicks, ...

# If using Mounts or custom elements
<project>/node_modules/foldkit/dist/mount/public.d.ts          # Mount.define / Mount.defineStream({ args?, messages })
<project>/node_modules/foldkit/dist/customElement/index.d.ts   # CustomElement.define: typed bindings to native web components

# If the host application drives the program
<project>/node_modules/foldkit/dist/port/public.d.ts    # Port.inbound / outbound / emit / stream

# If using forms
<project>/node_modules/foldkit/dist/fieldValidation/public.d.ts # Field (tagged union), makeRules({ required?, rules }), validate, allValid; Rule.url, Rule.email, Rule.minLength, Rule.pattern, Rule.fromSchema
# Rule.Rule is [Predicate, Rule.RuleMessage], NOT { test, message }. Field.Invalid has `errors: NonEmptyArray<string>`, not `error: string`.

# If using any UI component (SEPARATE PACKAGE)
<project>/node_modules/@foldkit/ui/dist/<component>/public.d.ts  # a class + `<Name>Live` or a `makeBlock` factory (stateful), or `view` + config type (render helper)
# For a stateful component, record its constructor args, Message constructors the parent sends (Requested*, InformedOf*), OutMessages, and view input type.

# If using dates
<project>/node_modules/foldkit/dist/calendar/index.d.ts # CalendarDate, today.local (Effect<CalendarDate>)
```

If a path above doesn't resolve, list the package's `dist/` and find the module. **The `.d.ts` is authoritative and this file is not.** Where the two disagree, the `.d.ts` is right and the disagreement is a bug in this skill worth reporting.

### What to record in the crib

For each symbol you'll call, write one line. For example:

```text
class X extends Block<X, Args?, ViewInput?, Exposed?>()('X', { Model?, Message?, OutMessage?, Command?: [...], Mount?: [...] }) {}
XLive = X.make(Effect.fn(function* (id, args) { ...yield services, yield* new Child(...) ...; return { model, start?, update, commands?, mounts?, stream?, subscriptions?, expose?, view } }))
update handler: (model, message) => { model, commands?, outMessage?, messages? }
instance: .id, .model, .view(input?), .send(Child.Message.X()), .on({ Tag: (model, outMessage, instance) => result }), .use
Command.define(name, { args?, messages, interrupt? }); call site: Fetch({ id }); handler: commands: { Fetch: ({ id }) => Effect<Message> }
Mount.define(name, { args?, messages }); view: h.OnMount(Measure()); handler: mounts: { Measure: ({ element }) => Effect<Message> }
h: HtmlBuilder<Message> (view parameter): { div, input (VOID), textarea (VALUE-ONLY), button, Class, Href, For, Id, Role, OnClick(Message), OnInput(value => Message), OnBlur(Message), OnSubmit(Message), OnMount(mount), keyed, empty, ... }
Route.mapTo(schema)(parser): curried
pushUrl(path): Effect<void>  // NOT fallible, no Effect.ignore needed
urlToString(url: Url): string
AsyncData.match(value, { onIdle, onLoading, onRefreshing, onFailure, onStale, onSuccess })
  // handlers take BARE values, except onStale: ({ error, data }) => B
Document (root view): { title, body } where body is a single Html
Input.view({ id, value, onInput, isInvalid?, type?, placeholder?, toView: attributes => Html }, h)
Field (schema): NotValidated | Validating | Valid | Invalid(errors: NonEmpty<Rule Message>)
```

### Specific API pitfalls the generator hits repeatedly

Record these in the crib and keep them visible while generating:

- **`input`, `br`, and other void elements take ONLY attributes**: `input([...])`, never `input([...], [])`. `textarea` also takes attributes only; set its content with `h.Value(text)`. `button` takes children.
- **The children argument is optional on elements that accept children.** Omit it when there are none: `h.div([h.Class('divider')])`, not `h.div([h.Class('divider')], [])`. Attributes stay required, so `h.div([])` is an element with neither. `keyed` follows the element: `h.keyed('li')(key, [attrs])`.
- **`UrlRequest` tags are `Internal` and `External`**, not `InternalUrl` / `ExternalUrl`.
- **`OnClick` and `OnSubmit` take a Message directly**, not a `() => Message`. Only `OnInput` takes `(value) => Message`.
- **`keyed` and `empty` are properties on `h`**, not top-level exports of `foldkit/html`.
- **Attribute helpers are specific**: `Value(...)`, `Type(...)`, `Placeholder(...)`, `Href(...)`, `Target(...)`, `Rel(...)`, `Rows(n)`, `Id(...)`, `For(...)`, `Role(...)`, `AriaLabel(...)`. There is no generic `Attr('...', '...')`.
- **`Route.mapTo` takes the route Schema, not a factory function.** `pipe(literal('new'), Route.mapTo(ApplicationRoute.NewLink))`.
- **`Effect.ignore` is ONLY for fallible Effects.** `pushUrl(path).pipe(Effect.as(Message.CompletedNavigateInternal()))`.
- **The constructor is synchronous.** It yields Services and declares child instances; it does no asynchronous work. Load data with a Command listed in `start`.
- **Handlers must return Effects with no remaining requirements.** Yield Services (`HttpClient.HttpClient`, `KeyValueStore.KeyValueStore`, `Clock.Clock`, `Crypto.Crypto`) in the constructor and close over them in `commands`, `mounts`, and Streams.
- **Every Command and Mount listed on the class needs a handler** under `commands` / `mounts`. A missing one fails at runtime, not at the call site.
- **`messages` on `Command.define` and `Mount.define` is required and always an array**, even for one Message.
- **A child's Model field Schema is the child class itself**, not `Child.Model`: `Schema.Struct({ search: Search })`.
- **Every Block the graph creates needs its Live Layer provided** to the parent Layer that creates it. A missing Layer is a type error on `Program.make`'s `layer`, or on `story` / `scene` in tests.
- **`.on(...)` entries are spread into the update record**: `...search.on({ SubmittedQuery: (model, { query }) => ... })`. When the parent Model type does not reach the handler, pass it explicitly: `...search.on<Model>({ ... })`.
- **The root view returns a `Document` (`{ title, body }`) with `Program.make`.** Every other view, and the root of `Program.makeElement`, returns `Html`.
- **`makeRules` takes `{ required?: Rule.RuleMessage, rules: Array<Rule.Rule> }` where `Rule.Rule = [Predicate, Rule.RuleMessage]`**, a tuple, NOT `{ test, message }`.
- **`Field.Invalid` has `errors: NonEmptyArray<string>`, not `error: string`.** Use `Array.headNonEmpty(errors)` for the first message.
- **Route variants stay on `ApplicationRoute`**: `ApplicationRoute.Home`, not sibling bindings named `HomeRoute`.
- **Routers are callable for printing**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. Never hand-construct URLs.
- **`HttpClient` and `HttpClientRequest` come from `effect/http`**, not `@effect/platform`. Yield `HttpClient.HttpClient` in the constructor and provide `Http.layer` from `foldkit` in `ApplicationLayer`, so a test can provide a deterministic HTTP Layer instead. `@effect/platform-browser` is a different package, used for `BrowserKeyValueStore` and `BrowserCrypto`.
- **Branch on a Model array with `Array.match`.** `Array.isArrayEmpty` / `Array.isArrayNonEmpty` take a mutable `Array<A>` and reject the `ReadonlyArray` that `Schema.Array(...)` decodes to.
- **Omit only statically empty Commands.** A handler that statically creates none omits `commands`. A computed collection is returned directly, even when empty. Never write `commands: []`. The same holds for `messages`.

## Phase 4: Generate the App

Generate files following the architecture and conventions guides. Write all source files into the scaffolded project's `src/` directory.

### Model

- Define the Model with Effect Schema: `Schema.Struct` for a record, a tagged union for distinct states.
- Use discriminated unions for state: `Idle | Loading | Error | Ok`, never booleans for multi-valued state
- Use `Option` for fields that may be absent. Never empty strings or null
- Prefix Option-typed fields with `maybe`: `maybeCurrentUser`, `maybeError`
- Suffix Model fields containing `AsyncData` values with `AsyncData`: `weatherAsyncData`, `workspaceAsyncData`
- For remote data, use `AsyncData` rather than hand-rolling a union. `AsyncData.Schema(WeatherData, Schema.String)` returns `{ schema, Idle, Loading, Refreshing, Failure, Stale, Success }`; put `schema` in the Model and build values with the constructors. `Refreshing` keeps current data on screen during a reload, and `Stale` keeps it after a failed reload. Read `AsyncData.match`'s signature before calling it: the handlers take bare values (`onSuccess: data => ...`), except `onStale`, which takes `{ error, data }`
- For non-remote multi-valued state (form steps, editor modes, connection phases), declare the whole union with `defineTaggedUnion()`. See Discriminated Unions for State in [conventions.md](conventions.md)
- Child instances live in the Model. The field Schema is the child class: `search: Search`, `maybeDialog: Schema.Option(Dialog)`, `rows: Schema.Array(Row)`, `editors: Schema.Record(Schema.String, Editor)`, or a field inside a tagged variant. Never a HashMap, HashSet, or class instance
- For apps with multiple domain entities referenced across modules, extract shared Schemas into `src/domain/` (e.g., `domain/product.ts`, `domain/session.ts`). See the shopping-cart and auth examples, and read `${CLAUDE_SKILL_DIR}/../../packages/website/src/page/projectOrganization.md` for guidance on structuring domain modules

### Messages

Declare the whole Message union with `defineMessageUnion()`, at module level, before the class:

```ts
export const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
  SucceededLogin: { user: User },
  FailedLogin: { error: Schema.String },
  CompletedFocusInput: {},
})
export type Message = typeof Message.Type
```

Keep the `Message` alias immediately below its Schema with no blank line. Construct variants through the namespace (`Message.ClickedSubmit()`, `Message.UpdatedEmail({ value })`). Never destructure constructors from `Message` or `OutMessage`. Keep each case's payload object on one line when it fits; let Oxfmt wrap longer ones.

Name Messages by category:

- `Clicked*`: button/link clicks
- `Updated*`: input value changes (with `{ value: Schema.String }`) and external state updates from Streams (`UpdatedRoom`, `UpdatedPlayerProgress`)
- `Submitted*`: form submissions
- `Succeeded*` / `Failed*`: paired, for Commands that can meaningfully fail
- `Completed*`: every other Command result, named from the Command (`CompletedFocusInput`, `CompletedGenerateCardId`)
- `Pressed*`: keyboard input
- `Blurred*`: focus loss
- `Selected*`: choice made from a list
- `Toggled*`: binary state flip
- `Requested*` / `InformedOf*`: Messages a parent sends to a child (`RequestedClear`, `InformedOfRouteChange`)

Every Message must carry meaning. No `NoOp`.

A child Block that reports facts to its parent declares an `OutMessage` union the same way, named for the fact: `SubmittedQuery`, `RequestedRemove`, `SucceededLogin`.

### Flags (if the initial Model needs side effects)

- Define a `Flags` Schema for data the initial Model needs from side effects, and `flags` as an `Effect<Flags>` that computes it (localStorage reads, current time, etc.), both in `application.ts` beside the root Block
- The root class takes `Readonly<{ flags: Flags }>` as args (`Readonly<{ flags: Flags; url: Url }>` with routing). Pass `Flags` to `Program.make` and the Effect to `Runtime.run(program, { flags })`. Provide any Services the Effect needs: `flags.pipe(Effect.provide(ApplicationLayer))`
- Never perform side effects at module level or in the constructor body to seed the Model
- See Flags in [architecture.md](architecture.md) for the full pattern

### Constructor (starting Model and startup Commands)

- Implement each Block with `X.make(Effect.fn(function* (id, args) { ... }))`. The constructor runs once per instance, synchronously, when the instance enters its parent's Model
- Yield Services first, then declare child instances with `yield* new Child(id, args)` and `yield* Child.each(collection, args)`
- Return `model` (the starting Model) and, when startup work is needed, `start: [LoadX(...)]`. `start` Commands run when the instance appears. Do not fetch, read storage, or read the clock in the constructor body
- Constructor args replace init arguments. The root's args are `{ url }` with routing, `{ flags }` with Flags, both, or none. Parse `url` in the constructor into an `ApplicationRoute`
- Return the starting Model as a plain record. The class checks it against the Model Schema. Use `Model.make` only where you construct a Model outside the constructor, such as test fixtures

### Update

- `update` is a record with one handler per Message tag. Each receives `(model, message)` and returns `{ model, commands?, outMessage?, messages? }`. Return results directly
- Extract a substantial single-Message handler into `handle<MessageTag>` in the Block's file and pass it as the record value. A large update record stays in the constructor; when the Block is too large to read, extract a feature into a child Block
- Use `modifyFields(model, { field: () => newValue })` for immutable updates. Pass point-free transformers when the update only depends on that field's current value: `items: Array.map(updateItem)`, `count: Number.increment`. Never spread or `Object.assign` an existing Model
- Give reusable Model-first transitions a descriptive name ending in `Step`, such as `refreshStep`, and sequence pure Steps with `Update.combineSteps`. Name an inline Step parameter `stepModel`. Call a single Step directly
- When a `Succeeded*` handler writes several caches and kicks off refetches, sequence them with `Update.combineSteps` and build refetch Steps with `Update.refresh({ read, revalidate, write, load })`, which reloads a cache only when it holds data. `examples/route-transitions/src/` shows both
- Omit `commands`, `outMessage`, and `messages` when absent. Never write `commands: []`. Use `Array.filter(commands, () => condition)` for a Boolean-conditioned group
- A child Block reports a fact with `outMessage: OutMessage.SubmittedQuery({ query })`. The parent handles it by spreading `...search.on({ SubmittedQuery: (model, { query }, instance) => result })` into its update record. Name every variant in the handler record
- A parent changes a child only by sending it a Message: `messages: [model.search.send(Search.Message.RequestedClear())]`. Never write the child's Model fields
- Never `switch`. Use the union's own `match` / `matchOrElse` for declared unions, and Effect `Match` for partial matches and shared handlers

### Commands

- Define each Command at module level with `Command.define(name, { args, messages })`; omit `args` when it takes none. Assign it to a PascalCase constant and list it under the class's `Command: [...]`
- Implement each listed Command under the constructor's `commands` record. The handler receives the decoded args and returns an Effect of one of the declared Messages, with no remaining requirements
- To make a Command interruptible, add `interrupt`: `true` keys every invocation by the Command name, `{ keyFields, toKey }` keys invocations by selected args. `examples/interrupting-commands/src/application.ts` shows `UploadFile.Interrupt(...)`
- Definitions live in the file of the Block whose update returns them. Never centralize all Commands in one file
- Let TypeScript infer return types. No explicit annotations on definitions
- Use `Effect.gen` for multi-step async
- Convert expected failures with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. If the Effect is infallible at the type level (`clock.currentTimeMillis`, `Random.nextIntBetween`), no `catch` and no `Failed*` Message is needed
- Command args carry values already in the Model or Message. Read time, randomness, and UUIDs inside the handler and return them in the result Message
- Name each Command for the effect its handler performs, not the later Model transition: a timer that only waits before dismissal is `WaitBeforeDismissal`, not `DismissAfter`
- Commands that can't meaningfully fail return `Completed*` Messages named from the Command, payload-carrying ones included: `DetermineStartTime` → `CompletedDetermineStartTime`
- Use Foldkit's `Dom` module for DOM operations (`Dom.focus`, `Dom.scrollIntoView`, `Dom.showDialog`, `Dom.lockScroll`) and Effect built-ins for time, randomness, and delay. For UUIDs, yield `Crypto.Crypto` in the constructor and provide `BrowserCrypto.layer` in `ApplicationLayer`. See DOM and Effect Helpers in [architecture.md](architecture.md)
- For HTTP, yield `HttpClient.HttpClient` (from `effect/http`) in the constructor and provide `Http.layer` from `foldkit` in `ApplicationLayer`
- A child's Command result returns to the child that issued it. The parent never maps child Commands

### Form Validation

When the app has form inputs that need validation (required fields, format checks, async uniqueness checks), use `foldkit/fieldValidation`. Do not hand-roll validation state.

```ts
import {
  Field,
  Rule,
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

const Model = Schema.Struct({
  name: Field(Schema.String),
  email: Field(Schema.String),
})
type Model = typeof Model.Type
```

`Field(valueSchema)` builds a tagged union: `NotValidated | Validating | Valid | Invalid`. The value Schema should match what the control holds as the user edits: `Field(Schema.String)` for text inputs, `Field(Schema.Array(Schema.String))` for a multi-select. Use `validate(rules)(value)` in update handlers to transition a field, and gate submission with `allValid([[state, rules], ...])`, which gates one field value type per call (combine calls with `&&` across types). Omit `required` to make a field optional.

References: `${CLAUDE_SKILL_DIR}/../../examples/form/src/` (including an async email uniqueness check with version-based stale-result handling) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/` (validated multi-step forms across Blocks, with a parent sending `RequestedRevealErrors`).

### Dates and File Uploads

For date handling (birthday, deadlines, scheduling):

- Use the `Calendar` module: `Calendar.CalendarDate`, `Calendar.today.local` (Effect returning today's date in the user's timezone), `Calendar.make(year, month, day)`, `Calendar.addDays`, etc.
- Use `DatePicker` (input + popover calendar) or `Calendar` (inline grid) from `@foldkit/ui` for the UI
- Seed today's date via Flags when the starting Model needs it, then pass it to the component's constructor args. See the `job-application` example

For file uploads (resumes, images, attachments):

- Use the `File` module for file primitives
- Use `FileDrop` from `@foldkit/ui` for a drag-and-drop and click-to-browse zone with validation
- The `ReceivedFiles` OutMessage carries `files: NonEmptyArray<File>`. A drop that produced no files arrives as the separate `RejectedNonFiles` OutMessage; handle it to surface a message like "Only files are accepted"
- Reference: `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/attachments.ts`

### View

- `view: (model, h) => ...` in the constructor return. Never annotate the primary view's `h` and never construct a builder
- Extracted helpers are plain functions that take only the values they read, followed by `h`, typed with a local alias: `type SearchViewBuilder = HtmlBuilder<Message>` from `foldkit/html`. Let TypeScript infer whether a helper returns one `Html` or an array. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`
- Render a child with `model.search.view()`, or `model.dialog.view({ toView, ... })` when it takes a view input. Key a collection of instances by `instance.id`: `h.keyed('li')(row.id, [], [row.view()])`
- Use `h.Class(...)` for Tailwind classes, and `clsx` for conditional composition: `h.Class(clsx('base-classes', { 'active-class': isActive }))`. Never string concatenation, template literals, or `&&` expressions
- Pattern match on Model state through the union: `State.match(model.state, {...})`. Use `Option.match` for Option fields and `Array.match` for lists that may be empty. Use `h.empty`, not `null`
- Never key branches. Extract a same-tag inline ternary into named view functions when switching must reset DOM state
- Wire events to Messages: `h.OnClick(Message.ClickedSubmit())`, `h.OnInput(value => Message.UpdatedEmail({ value }))`
- Keep comments sparse. Use a section header only for a substantial group in a long file, and `// NOTE:` only for a timing dependency, browser quirk, or external constraint that clear names cannot express

### Program wiring

- `entry.ts` creates the Program and starts the Runtime:

```ts
const program = Program.make(Application, {
  layer: ApplicationLive.pipe(
    Layer.provide(Layer.mergeAll(SearchLive, Dialog.DialogLive)),
    Layer.provide(ApplicationLayer),
  ),
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: Application.Message.ClickedLink,
    onUrlChange: Application.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program)
```

- `layer` provides the root Block, every Block the graph creates, and their Services. A child Block's Layer must be provided to every parent Layer that creates it. A feature may instead provide its own children inside its Live Layer (`EditorLive = Editor.make(...).pipe(Layer.provide(DatePicker.DatePickerLive))`) so its parents provide only `EditorLive`
- `ApplicationLayer` (in `services.ts`) holds ordinary Services: `Http.layer`, `BrowserKeyValueStore.layerLocalStorage`, `BrowserCrypto.layer`, and app-specific Services
- With Flags, add `Flags` to the options and call `Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })`
- `devTools: { dispatch: true }` lets external DevTools clients dispatch the root's Messages. Omit `devTools` to keep inspection with dispatch disabled; `devTools: false` disables DevTools entirely
- `Program.makeElement(Application, { layer, container, ... })` creates a widget scoped to a container on a page it does not own. Its root view returns `Html`, it has no `routing`, and it never touches the document head. Use `Runtime.embed(program)` when a host must mount, dispose, or communicate through Ports; mirror `repos/foldkit/examples/embedding/`
- Server rendering (SSR/SSG) hydrates with `Runtime.hydrate` from a separate client entry. Follow FOLDKIT.md and the installed `create-foldkit-app` template when the user asks for it
- Include `ClickedLink` and `ChangedUrl` Messages for programs with routing, with `UrlRequest.Internal` / `UrlRequest.External` handling in update

### Routes (if multi-page)

- Use the bidirectional parser: `defineRouteUnion()`, `string()`, `int()`, `literal()`, `slash()`, `Route.mapTo()`, `Route.oneOf()`
- Declare every route in one `defineRouteUnion({ Home: {}, NewLink: {}, NotFound: { path: Schema.String } })` named `ApplicationRoute`. Keep each variant on that namespace: `ApplicationRoute.Home`
- When a Model or Schema accepts only part of `ApplicationRoute`, use `ApplicationRoute.subset(['Home', 'Person'])`. It includes only the tags named. There is no `omit`. Name a variant type when an annotation needs it: `type PersonRoute = typeof ApplicationRoute.Person.Type`
- Build each route as a Router: `const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))`. Routers are callable printers: `homeRouter()` returns `'/'`
- **Never hand-construct paths with template strings.** `Href(homeRouter())`, not `Href('/')`. `Href(tagFilterRouter({ tag: tagName }))`, not ``Href(`/tag/${encodeURIComponent(tagName)}`)``
- Parse the starting `url` in the root constructor and later URLs in `ChangedUrl`. Use `Route.parseUrlWithFallback` for a full `Url`
- When a page Block needs to react to a route change, the root sends it `InformedOfRouteChange` from `ChangedUrl`. `Transition.make` and `Transition.matchOrElse` from `foldkit/route` describe entered, stayed, and exited pages. `examples/routing/src/application.ts` shows both
- Render each route through its own view function; route branches are never keyed. Key by entity id only when one view function renders different entities across route params
- Use `pushUrl` from `foldkit/navigation` in a Command for programmatic navigation. In the `ClickedLink` handler's `Internal` case, use `urlToString(url)` from `foldkit/url`
- In the `ClickedLink` handler, **don't pre-update `model.route`**. The runtime fires `ChangedUrl` after `pushUrl` resolves

### Lifecycle effects (Mounts, Streams, Subscriptions, exposed handles)

Pick the primitive by what causes the side effect. See [architecture.md](architecture.md) for each in detail.

- **A Message just dispatched** → a Command returned from update.
- **An element exists and the handler uses it** → a Mount: `Mount.define(name, { args?, messages })` or `Mount.defineStream` for continuous events, listed under `Mount: [...]`, implemented under `mounts`, attached with `h.OnMount(MeasurePanel())`.
- **An event source for the instance's whole life** → `stream`, a Stream of the Block's own Messages.
- **An event source gated by Model state** → `subscriptions: { name: { dependencies: model => ..., stream: dependencies => Stream } }`. Return `Stream.empty` when the condition is off. The runtime restarts the Stream when the dependencies change.
- **A stateful handle that Commands need (socket, camera, library instance)** → a child Block that acquires it in its constructor with `Effect.acquireRelease` and exposes it with `expose`. The parent holds the child in an `Option` field while the handle should exist and reads it in Commands with `instance.use`.
- **A native web component** → `CustomElement.define`.

## Phase 4.5: Self-check before verification

Before running `tsc` or opening the browser, do a mechanical pass over the generated files. The reviewer in Phase 6 catches these, but catching them at write-time is cheaper.

**Run the lint script first, then the "Mechanical scans" block in `checklist.md`** against `src/`. The scaffold wires `@foldkit/oxlint-plugin`, whose rules are the structural check: keyed rows, route printing, empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`, child ownership, and Command naming. Treat every `foldkit(...)` diagnostic as a blocker; that is how they are labelled in the output. The greps then cover ground no rule touches (stale API, `@foldkit/ui` adoption, Effect idiom, unpaired labels, `maybe*` on non-Option, `span([])` placeholders, redundant `Effect.ignore`, focus-outline resets) plus the edges of rules that are deliberately narrow. A green lint does not clear those. Each hit is either a fix or a `// NOTE:` justification.

Then eyeball each file you wrote:

- **Every file's imports**: do you use every symbol?
- **Every Message in the union**: does update have a handler for it? Does something dispatch it?
- **Every state variant**: is it ever entered? Does the view render something different when it's active?
- **Every Command and Mount**: is it listed on the class, does it have a handler, is it tested, and does its result Message have a handler?
- **Every child Block**: is its instance in the parent Model, its Layer provided, and each OutMessage it can report handled in `.on` or deliberately ignored?

## Phase 5: Verify and Test

### Gate: four commands must succeed before declaring Phase 5 complete

Run ALL FOUR and fix everything they surface:

```bash
npm run format      # run FIRST: rewrites files
npm run lint
npm run typecheck
npm run test
```

Use whichever package manager the project was scaffolded with: `npm run`, `pnpm run`, `yarn`, or `bun run`. If a script is missing, run the project-local binary through that manager's exec (`pnpm exec oxfmt`, `npm exec --no-install oxfmt`, `yarn exec oxfmt`, `bun x --no-install oxfmt`). Avoid bare `npx`, which fetches and runs a package from the registry when the binary isn't installed locally.

Run **format first** because it rewrites files. Running it last would leave tsc and tests passing against unformatted code that a pre-commit hook would then reformat.

Each catches different classes of issue:

- **Format** rewrites spacing, indentation, trailing commas, and line wrapping to project style. Generated code rarely matches Oxfmt's exact output by accident.
- **Lint** catches unused imports, unused variables, and Foldkit rule violations. `tsc` doesn't flag unused imports.
- **Typecheck** catches API misuse, wrong parameter shapes, missing child Layers, and structural type errors.
- **Tests** catch behavioral regressions.

Fix ALL output from all four before declaring Phase 5 done. "Typecheck clean and tests pass" is insufficient.

### Tests

Tests run on `@effect/vitest` against a Block's Layer. There are two styles. Name each test file for its style, beside the code under test: `story.test.ts` drives update, `scene.test.ts` drives the rendered view. When a folder holds more than one test of a kind, prefix with the subject: `login.story.test.ts`. Put a page's own tests in its folder, driving its own Layer, and keep root-level tests for flows that cross pages.

```ts
import { Effect, Layer } from 'effect'
import { Command, message, model, story } from 'foldkit/story'

import { describe, expect, it } from '@effect/vitest'

const application = ApplicationLive.pipe(Layer.provide(SearchLive))

it.effect('SubmittedSearch saves the query', () =>
  story(
    application,
    { url: startUrl },
    message(Message.SubmittedSearch()),
    Command.expectExact(SaveQuery),
    Command.resolve(SaveQuery, Message.FailedSaveQuery({ reason: 'offline' })),
    model(model => {
      expect(model.saveState._tag).toBe('Failed')
    }),
  ).pipe(Effect.provide(ApplicationTestLayer)),
)
```

- `story(layer, args?, ...steps)` and `scene(layer, args?, ...steps)` build the instance from its Layer and start from the Model its constructor returns. Pass constructor args after the Layer when the Block takes them. `start` Commands are not in the ledger. `given(model)` replaces the starting Model
- The Layer must provide exactly one root Block. Provide children with `Layer.provide`, not `Layer.merge`. Provide Services the constructors yield with `.pipe(Effect.provide(TestLayer))` on the returned Effect
- In tests the Model is resolved: every instance appears as its own Model (`model.search.query`). `given` can set child state but cannot add or remove instances; send the Messages that do that
- Deliver a child's Message with `message(Block.deliver(Search, 'search', Search.Message.SubmittedQuery({ query })))`. Keyed instances use the path form `['rows', 'row-3']`; nested instances list every id from the root. Stream and Subscription emissions are Messages too: deliver them the same way
- Neither style runs Command handlers. Assert with `Command.expectHas`, `Command.expectExact`, or `Command.expectNone`, and resolve with `Command.resolve(Definition, resultMessage)`. A child's Command result routes back to the child automatically. Scene's `Mount.resolve(Definition, resultMessage)` does the same for Mounts
- Assert OutMessages with `expectOutMessage` / `expectNoOutMessage` when testing a child Block directly
- Import the steps as named imports from `foldkit/story` or `foldkit/scene`. A test file needs only one of the two. If a single file tests both, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable
- A Scene root cannot take a view input. Test such a Block through a small test-only parent Block that renders it
- For an execution test of a Command handler, provide controlled Services to the production Layer and run the program, or test the Effect the handler wraps directly. Replace the lowest boundary the test does not need to exercise: keep an `ApiService` that owns decoding and retries, and replace its HTTP transport

**Story tests** (`story.test.ts`) drive update: send Messages, assert on the Model and Commands. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/counter/src/story.test.ts`: the minimal shape
- `${CLAUDE_SKILL_DIR}/../../examples/routing/src/story.test.ts`: root args, a provided child Layer, `Block.deliver`, and child Command resolution
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/login.story.test.ts`: a child Block with OutMessage assertions and field validation

Write `story` pipelines covering:

- **Happy path**: the primary user flow from start to finish
- **Error path**: every fallible Command resolved with its `Failed*` Message
- **Multi-step interaction**: at least one test that chains multiple Messages and Command resolutions
- **Edge cases**: empty states, boundary conditions, ignored inputs (stale results, duplicate submissions)

**Scene tests** (`scene.test.ts`) drive the rendered view by accessible locators (role, label, text) and assert on what the user sees. A `scene.test.ts` is **REQUIRED** for Tier 3+ apps. The review loop treats its absence as a BLOCKER. Study these exemplars:

- `${CLAUDE_SKILL_DIR}/../../examples/counter/src/scene.test.ts`: basic interaction
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/scene.test.ts`: a root-level Scene driving a login flow across child Blocks
- `${CLAUDE_SKILL_DIR}/../../examples/charting/src/scene.test.ts`: `Mount.resolve` and a `@foldkit/ui` component's test Commands

Write `scene` pipelines covering:

- **View rendering**: initial view has expected elements (headings, inputs, buttons)
- **User interactions**: click, type, submit produce visible changes
- **Loading states**: submitting shows a loading indicator
- **Error states**: failed Commands show error messages in the view
- **Scoped queries**: `within(parent, child)` composes a single scoped Locator; `inside(parent, ...steps)` scopes a block of steps to one parent
- Prefer accessible locators: `label(...)`, `role(...)`, `text(...)` over `placeholder(...)` or CSS selectors
- An interaction whose handler returns `Option.none()` lets the event fall through; follow it with `expectIgnored()`. Use `expectHandled()` where the event should have been consumed

Run the project's test script to verify tests pass. Then run through the [verification checklist](checklist.md) and fix any remaining issues.

## Phase 5.5: Visual and a11y verification

Code review and automated tests don't catch rendering bugs or accessibility gaps. Two things to do before Phase 6:

### Visual check

Start the dev server (`npm run dev`) and open the app in a browser. Click through every route. Interact with every form. Watch for:

- Inputs with missing backgrounds (Tailwind preflight strips the browser-default white; `bg-white` must be explicit on every raw `input` or `textarea` you don't route through `Input` or `Textarea`)
- Text that's too dim or too small to read
- Overlapping elements, broken spacing, layout shifts
- Cursor and hover states that don't feel right
- Focus rings that are invisible or missing on interactive elements

If the app has UI, **don't claim Phase 5 complete until you've loaded the app and clicked through it.** If you can't run a browser in your environment, say so explicitly in the final report rather than skipping the check silently.

### A11y check

Walk the **Accessibility** and **Foldkit UI** sections of `checklist.md`. Both have mechanical grep commands. Run them against `src/`. The checklist is the canonical copy of these greps.

A11y items are correctness for a non-visual user, not polish.

## Phase 6: Subagent Review Loop

Self-review is weaker than fresh-eyes review. After Phase 5 passes, spin up subagents to review the generated code against the quality bar, and iterate until they sign off.

### Loop mechanics

Run up to **three rounds**. Each round:

1. Spawn a review subagent using the `Agent` tool with `subagent_type: general-purpose`.
2. Read the subagent's response.
3. If the response is `PASS`, exit the loop and proceed to Phase 7.
4. If the response contains `BLOCKERS` or `QUALITY` items, fix each, then loop.
5. `NICE-TO-HAVE` items can be deferred to Phase 7's future-work list if the round budget is exhausted.

After round 3, if issues remain, exit the loop and carry the unresolved items into Phase 7 as "known polish areas". Do not silently ship flagged code.

### Review subagent prompt

Use a prompt of roughly this shape. Tailor only the file list and project path. Keep the rubric, output format, blind-spots checklist, and bar-setting instructions intact.

```text
You are reviewing a freshly generated Foldkit program. The bar is:
this code should be indistinguishable in quality from hand-written
code in `packages/typing-game/client/src/` or `packages/website/src/`.
Not "works." Not "structurally valid." Typing-game quality.

Read FIRST, in this order:
1. The generated source files, project-relative: list every one
   (src/application.ts, src/page/home.ts, ...).
2. The project's FOLDKIT.md.
3. ${CLAUDE_SKILL_DIR}/architecture.md
4. ${CLAUDE_SKILL_DIR}/conventions.md
5. ${CLAUDE_SKILL_DIR}/checklist.md
6. ${CLAUDE_SKILL_DIR}/blindSpots.md
7. At least one exemplar matching the generated app's complexity,
   from the foldkit repo (vendored at repos/foldkit/ when the project
   has the subtree):
   - Tier 1-2: examples/counter/src/ or examples/stopwatch/src/
   - Tier 3-4: examples/routing/src/ OR examples/form/src/
   - Tier 5: examples/shopping-cart/src/ AND its domain/
   - Tier 6: examples/auth/src/ AND examples/job-application/src/step/
   - Tier 7: examples/websocket-chat/src/ AND packages/typing-game/client/src/page/

Every path above is either project-relative or resolved through
${CLAUDE_SKILL_DIR}, the same way the rest of this skill refers to its
own files. Do not rewrite them as absolute paths. An absolute path is
machine-specific and makes the prompt unusable on any other machine.

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
page/home.ts:33-40".
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

- If the verdict is `PASS` on any round → proceed to Phase 7, no caveats.
- If the verdict is `NEEDS-WORK` after round 3 → proceed to Phase 7 but list the outstanding `BLOCKERS` and `QUALITY` items under "Known polish areas." The user should see them.

### Between rounds: actually fix, don't just acknowledge

Between rounds, apply fixes for every BLOCKER and every QUALITY item the reviewer flagged. Do not carry items forward with "I'll note this" or "deferring" unless the round budget is exhausted. A QUALITY item flagged in round N that's still present in round N+1 is a process failure: the generator read the review and didn't act.

Common failure mode: the reviewer flags `.length > 0` checks as QUALITY and names `Array.match` / `String.isNonEmpty` as the fix. The generator moves to other fixes, round 2 flags the same thing again, and nothing happens because "round 2 is clean on BLOCKERS." Untriaged QUALITY items become silently shipped rot.

Before running round N+1, produce a short written diff between "what round N flagged" and "what I changed." If the lists don't match, fix the gap before running round N+1.

## Phase 7: Explain

After generating the program (and passing review), walk the user through what was built:

1. **Files generated**: list each file with a one-line description of the Block it holds, or of why it is an entry, `services.ts`, `route.ts`, or a shared `domain/` module
2. **Architecture decisions**: explain key modeling choices. For example: which discriminated unions were used and why, which features became child Blocks, which Foldkit UI components were integrated, why Flags were or weren't needed, and any domain extraction decisions
3. **Review outcome**: state how many review rounds ran and the final verdict. If `NEEDS-WORK` after round 3, list the outstanding items verbatim under "Known polish areas"
4. **How to run**: remind the user to start the dev server and what they should see
5. **How to extend**: give concrete next steps: "to add bookmark editing, define `ClickedEditBookmark` and `UpdatedEditTitle` Messages, add an `Editing` variant to the Model, and handle both in update"
6. **When to restructure**: mention signals that the program has outgrown its current organization (e.g., "if the root update record exceeds ~20 handlers, or one feature's Messages dominate it, extract that feature into a child Block")
