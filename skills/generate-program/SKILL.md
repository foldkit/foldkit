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
11. **Multi-state flows**: a described process that moves through several named steps with rules about which step follows which (checkout, onboarding, multi-step approval, a connection lifecycle) → consider the `Machine` module (`foldkit/experimental`). Writing the transitions as a table lets `unreachableStates()` and `deadTransitions()` inspect reachability through the declared Edges from `initial` and any caller-supplied extra roots. The analysis cannot see state changes made outside the Machine, so pass restored, deep-linked, hydrated, and other externally entered states as extra roots before treating its findings as application defects. Present it as an experimental option and let the user choose. For a flow with only two or three states, use `defineTaggedUnion` and one `match`. `repos/foldkit/examples/state-machine/` is the reference
12. **Host embedding**: the Program runs inside another app ("a widget in our React app", "embed this in an existing page", "the host needs to control it") → `Program.makeElement({ block: ApplicationBlock, ... })` plus the `Runtime.embed` lifecycle handle, with Flags for initial data and Ports for ongoing communication in both directions. `repos/foldkit/examples/embedding/` is the canonical reference: a plain TypeScript host driving a Foldkit widget end to end

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

Read only the references that affect this program:

- [Architecture guide](architecture.md) for the TEA loop and the primitives the
  requested behavior needs
- [Conventions guide](conventions.md) for the naming, Schema, Effect, and update
  patterns used by the files you will write
- [Block composition and Layers](../foldkit/references/composition.md) when the
  app has a Block, stateful Foldkit UI component, child Binding, Mount,
  OutMessage, child startup policy, handler recipe, or Service Layer
- [Verification checklist](checklist.md) for the applicable gates and quality
  bar
- [Blind spots](blindSpots.md) for the failure modes relevant to the planned
  behavior

Do not load every guide merely because it exists. Identify the program's
architecture surfaces first, then read the matching sections and one current
exemplar. These files are snapshots of a moving codebase. When they disagree
with `repos/foldkit/` or the installed declarations, the installed version is
right. Mention a disagreement in the final report so the skill can be repaired.

When an Effect API is uncertain, verify its current signature from the installed
package or official Effect documentation instead of guessing.

### Quality exemplars

Two codebases are the _quality bar_ for generated apps. Not just "patterns to copy" but "the level of craft to match":

- `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/`: production multi-page app: Blocks, OutMessage, update/view decomposition, curried handler extraction, subscription patterns, domain modules.
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/`: production Foldkit website: page organization, shared view primitives, route-driven rendering, idiomatic domain separation.

Before generating, spot-check at least ONE file from each (the shape of `update.ts` / how handlers get extracted / how domain files are structured) and match that level of craft in your output. The generated code should be indistinguishable from hand-written exemplar code.

Then read the tier-specific example files that match the app's complexity. **Always read at least one tier-specific example.** Never generate from memory alone.

### Complexity tiers

**Tier 1: Single page, no async, minimal state:**
Read `${CLAUDE_SKILL_DIR}/../../examples/counter/src/application.ts`

**Tier 2: Timers, subscriptions, simple stateful apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/application.ts` (timer via subscription, `Duration` field pattern) and `${CLAUDE_SKILL_DIR}/../../examples/todo/src/update.ts` and `flags.ts` (CRUD with localStorage via Flags)

**Tier 3: Async operations, loading/error states, API calls, form validation:**
Read `${CLAUDE_SKILL_DIR}/../../examples/weather/src/command.ts` (HTTP with `HttpClient`) and its `update.ts` (request state transitions) and `${CLAUDE_SKILL_DIR}/../../examples/form/src/update.ts` (uses `foldkit/fieldValidation`; see the Form Validation section in Phase 4)

**Tier 4: URL routing, multiple pages, query parameters:**
Read `${CLAUDE_SKILL_DIR}/../../examples/routing/src/update.ts` and `${CLAUDE_SKILL_DIR}/../../examples/query-sync/src/update.ts`

**Tier 5: Complex state, nested domain models, CRUD, drag-and-drop:**
Read `${CLAUDE_SKILL_DIR}/../../examples/shopping-cart/src/model.ts` and `update.ts` (nested domain Schemas and cart state) and `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/composition/dragAndDrop.ts`, `flags.ts`, and `update.ts` (CRUD with `DragAndDrop`, Flags restoring from localStorage, subscriptions)

**Tier 6: Blocks, OutMessage, multi-step forms, auth flows, multi-module apps:**
Read `${CLAUDE_SKILL_DIR}/../../examples/auth/src/composition/`, `update.ts`, and `view.ts` (login/signup with Blocks, OutMessage, protected routes) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/composition.ts`, `update.ts`, and `step/` (multi-step form with deeply nested Blocks, `DatePicker`, `FileDrop`, `Listbox`, and the `Calendar` module for date handling)

**Tier 7: Real-time, WebSocket, Managed Resources, production-grade:**
Read `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/update.ts`, then explore its `page/home/` and `page/room/` directories for the full Block/OutMessage pattern.

Read the nearest tier-specific example plus any focused example for a primitive
this app actually uses. Lower tiers are a lookup index, not a mandatory reading
sequence.

## Phase 2.5: Identify Foldkit UI Component Opportunities

Foldkit ships accessible UI components that handle keyboard navigation, ARIA attributes, and focus management automatically. They live in a **separate package**, `@foldkit/ui`, and are imported by name:

```ts
import { Button, Combobox, Dialog, Input } from '@foldkit/ui'
```

There is no `Ui` namespace on the `foldkit` package. Import the `Dialog` namespace from `@foldkit/ui`, create `const DialogBinding = ParentDefinition.makeBinding(Dialog.DialogBlock, ...)`, include it in the parent Composition's `bindings`, and render through `h.block(DialogBinding.embedView(...))`. Component subpaths such as `@foldkit/ui/dialog` expose the same completed Block and intentional domain exports. Generic component namespaces expose a `create` or `make` factory; name its exact completed result locally before binding it.

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

**Stateful Blocks** carry their own Model, Message, update, and (mostly) OutMessage, and are embedded via `h.block`: `Menu`, `Listbox`, `Combobox`, `Calendar`, `DatePicker`, `Dialog`, `Popover`, `RadioGroup`, `Tabs`, `Tooltip`, `FileDrop`, `DragAndDrop`, `Slider`, `VirtualList`, plus `Toast` once built through `Toast.make(PayloadSchema)`.

**Stateless render helpers** have no Model at all. You call `view` directly with a ViewConfig and your own `h`, and store the value in your own Model: `Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`.

Don't take that split on faith, because components have moved across it (`Checkbox`, `Switch`, and `Disclosure` became controlled render helpers; `RadioGroup` became a Block; `Tabs` and `Slider` moved their selection to the parent Model). Read the component's `public.d.ts`: an ordinary stateful namespace exports a completed `FooBlock`; a generic stateful namespace exposes a factory that returns the exact completed Block. A namespace exporting only `view` and a `ViewConfig` / `ViewInputs` type is a render helper.

To use a stateful component, bind its completed Block through the parent
Definition, register that Binding in the parent's Composition, initialize it
through the Binding's startup policy, and render it through
`h.block(binding.embedView(...))`. The Composition generates child delivery
envelopes and collects the child's lifecycle and handler graph. Put parent
admission policy in `delivery.when`, derive required child update context with
`delivery.toUpdateContext`, and provide `keySchema` for a custom keyed Binding.
Do not author a parent `Got*` variant or Message mapper for the child.

Read [Block composition and Layers](../foldkit/references/composition.md) for
the complete storage, routing, startup, view, and Layer decisions. Then inspect
the component's current declarations and its ui-showcase integration. Do not
copy a fixed Binding recipe across components: generic factories, optional
children, keyed children, and parent-owned selection have different contracts.

Select a whole feature's alternate local handler recipe with
`FeatureBlock.replaceEffectsLayer(localRecipe)` before binding it. Ordinary execution
tests retain real handlers and replace Service providers below them.

**Always prefer Foldkit UI components over hand-rolling interactive widgets.** They make accessibility the default, not an afterthought.

**For form inputs specifically:** every text input, textarea, and button in a form MUST go through `Input`, `Textarea`, and `Button`. This is not optional, even though raw `input`/`textarea` HTML elements are available on the view's builder `h`. The form example (`examples/form/src/view.ts`) defines `inputFieldView` and `textareaFieldView` helpers that wrap `Input.view` and `Textarea.view` with label + validation feedback. Copy that helper pattern. Raw `input`/`textarea` are for non-form cases (search fields, inline editors) where you're intentionally working below the component layer, and even then, reach for the component first.

If the app uses UI components, **always read the ui-showcase example first** to understand how components are wired. This is the canonical reference for Foldkit UI integration patterns:

- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/composition.ts` and `update.ts`: root wiring, generated child delivery, field mappings, and local parent Messages
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/message.ts`: how locally authored component Messages are structured
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/model.ts`: how component Models are composed
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/update.ts`: how component updates are delegated
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/block.ts`: completed `UiBlock` and local handler recipe
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/composition/composition.ts`: parent-owned component Binding policies and automatic lifecycle composition
- `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/toast.ts`: read when using `Toast`. `Toast.make(PayloadSchema)` returns a completed Block with its refined payload type, Subscriptions, and `EffectsLayer`

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

**Small application** (Tier 1-2):

```
src/application.ts  ← All root Model, Message, init, update, view, Composition, and ApplicationBlock
src/entry.ts        ← Program host inputs and Runtime.run
src/services.ts     ← ApplicationLayer providers, when ordinary Services are required
```

**Split application** (Tier 3-5):

```
src/definition.ts   ← Application contract when Definition authoring methods need it
src/composition.ts  ← ApplicationComposition and complete root graph
src/block.ts        ← ApplicationBlock assembly
src/entry.ts        ← Program host inputs and Runtime.run
src/services.ts     ← ApplicationLayer providers, when ordinary Services are required
src/model.ts
src/message.ts
src/init.ts
src/command.ts      ← Command definitions and a small root EffectsLayer
src/update.ts
src/view.ts
src/route.ts        ← When routing is used
src/domain/         ← Shared domain Schemas and pure operations
```

If a Command needs to import result constructors, extract `message.ts` before separating that Command from update. `definition.ts`, `command.ts`, and `update.ts` import the Message union directly without importing the completed root graph. A genuinely compact root defines Model, Message, init, update, view, `ApplicationDefinition`, `ApplicationComposition`, and `ApplicationBlock` together in `application.ts`. Once any root responsibility is extracted, split the whole root: retain `definition.ts` when authoring methods use `ApplicationDefinition`; otherwise put the top-level factory-to-Composition chain in `composition.ts`; named files own Model, Message, init, update, view, and optional Flags; `composition.ts` owns Bindings, OutMessage folds, the complete graph, `ApplicationComposition`, and an optional `ApplicationViewBuilder`; and `block.ts` assembles `ApplicationBlock`. Even a graphless split root has `composition.ts`. Remove the emptied `application.ts` instead of using it as a re-export or implementation bundle. Keep a simple root `EffectsLayer` with its Command definitions in `command.ts`; use `layer.ts` only when Layer composition is substantial or reused. `entry.ts` imports the Block and supplies host options to `Program.make` or `Program.makeElement`.

**Feature folders** (Tier 6-7):

```
src/page/
  index.ts          ← Exports `* as Search` and `* as Settings`
  search/
    index.ts        ← Explicit public barrel
    definition.ts   ← Contracts and named Definition when authoring methods use it
    search.ts       ← Substantial cohesive behavior, if not in focused files
    block.ts        ← Final completed Block and small local EffectsLayer
    composition.ts  ← Bindings, registrations, Composition, SearchViewBuilder
    view.ts         ← Canonical view importing Composition
    layer.ts        ← Optional; substantial or reused local EffectsLayer composition
    model.ts        ← Optional focused contract module
    message.ts      ← Optional focused contract module
    update.ts       ← Optional focused behavior module
    command.ts      ← Optional focused effect-definition module
  settings/
    ...
```

The tree shows available seams, not required files. Organize around responsibilities, not one file per construction stage. Keep compact features together. When Commands, Steps, lifecycle entries, or Bindings need it, `definition.ts` establishes Model, Message, and OutMessage contracts and exports their Definition. When the Definition's only use is `makeComposition`, put those contract imports and the top-level factory chain in `composition.ts` and omit `definition.ts`. Never move the factory into a callback, loop, or conditional. A focused init or update module imports the named Composition and authors its function through `FeatureComposition.makeInit` or `FeatureComposition.makeUpdate`. Composition must not import those implementation modules in return, and they never import the completed barrel. Put substantial cohesive behavior in the folder-named implementation file, let the view import its Composition, and let the small final `block.ts` import both so neither implementation nor view imports the completed barrel. Retain focused init, update, command, and contract files when each improves navigation. Compose a small local `EffectsLayer` in `block.ts`; use `layer.ts` only when that composition is substantial or reused. Export the completed `SearchBlock` from the explicit feature barrel. Keep authoring values and implementation helpers private; the completed Block supplies its Model, complete Message, OutMessage, init, view inputs, and operations. Put reusable Schemas and pure domain utilities in an explicit domain barrel. A parent imports `SearchBlock` and passes it to its own Definition's `makeBinding` method. A generic factory returns the exact completed Block, which the caller names locally.

For ordinary source Blocks, place the existing preparation call in one private zero-argument producer named `prepare`, then put the checked completed export immediately after it with no blank line: `ChildBlock: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)`. Use a descriptive producer name only when one file genuinely contains multiple preparation producers. Choose `FromAssemblyWithViewAndOutMessage`, `FromAssemblyWithOutMessage` or `FromAssemblyWithoutViewOrOutMessage` when the actual view/OutMessage contracts differ. `prepareBlock` returns an opaque unfinished assembly with no Model or runtime methods; `Block.assemble` invokes the producer exactly once during passive configuration and produces the branded Block accepted by Bindings, Programs, and Server rendering without running init, constructing Layers, or starting effects. These four explicit shapes keep the canonical Model boundary independent of whole-implementation inference while retaining framework contract checks. A parent Schema projection therefore does not force TypeScript through the entire implementation's inferred type graph. This can improve targeted checking and member completion; it does not eliminate all TypeScript latency. Parent Schemas use `ChildBlock.Model`; the feature barrel exports the completed Block and keeps Model, local Message, Definition and Composition internal. The recommended `foldkit/no-completed-block-model-in-schema` rule rejects known inferred completions in Schema construction but accepts its recognized checked boundary. Use actual helper imports and a matching declaration annotation, producer, and finisher; casts, `satisfies`, raw producer calls, annotations alone, and helper-shaped names are insufficient. `replaceEffectsLayer` and `provideHandlers` preserve the assembly brand and passive runtime value. Keep published generic UI contracts intact and never repeat a generic factory call to obtain a Model.

A split feature's `composition.ts` owns its Composition, straightforward Bindings, and the complete `makeComposition({ bindings, mounts })` call. This includes graphless split features. A retained `definition.ts` never owns a Composition or ViewBuilder; when its Definition would only create the Composition, omit the file and chain the factory at module scope in `composition.ts`. Use it for Mount-only features too, with local Mount definitions in `mount.ts`. Extract a substantial one-way child policy to `composition/<child>.ts`; then `composition/composition.ts` stays the single assembly point, with an explicit `composition/index.ts` barrel. The assembly imports actual policy exports directly from sibling modules, and the barrel re-exports intended values such as `HomeBinding`, `RoomBinding`, and `ApplicationComposition`. Use a factory only when Binding construction needs caller-owned configuration. Keep reciprocal sibling policies together in the same parent assembly and defer sibling Binding calls through policy callbacks; a callback can close over a Binding declared later without a circular import. External consumers import from `composition.ts` or its explicit barrel, never from a policy or assembly implementation path. A split root uses the same assembly choice even when graphless, while a genuinely compact root keeps assembly in its all-in-one `application.ts`. Do not create arbitrary Binding categories or duplicate child binding lists. A split graphless feature exports its named empty Composition from `composition.ts`, so view and completion import that same graph assembly value. A compact graphless feature keeps that value beside its cohesive implementation. Composition must not import the primary view, update matcher or completed Block; at the root it likewise never imports init, update, or view. Extract a one-way policy-dependent parent Step into a leaf module when needed. `makeBinding` only configures the relationship; registering it under `bindings` adds the graph, and Runtime starts effects later.

Use standard local structural names: Model, Message, OutMessage, Flags, init, update, view, operations, subscriptions, managedResources, mounts, and EffectsLayer. The completed Block supplies context in parent code, such as `SearchBlock.Model` and the whole `SearchBlock` passed to `ParentDefinition.makeOutMessageFold`. Domain Schemas and individual effects retain descriptive names.

Use direct Schema type queries for routine application annotations. Inside the owning feature, write `typeof Model.Type`, `typeof Message.Type`, or `typeof OutMessage.Type`; a consumer of a completed child writes `typeof ChildBlock.Model.Type`, `typeof ChildBlock.Message.Type`, or `typeof ChildBlock.OutMessage.Type`. Parent Schema construction uses the checked completed `ChildBlock.Model`; ordinary type annotations keep completed Block queries. Let Definition callbacks and Composition-owned handlers infer their parameters. Do not create routine colocated Schema aliases. Keep aliases that deliberately publish a library contract or name a useful generic, mapped, or conditional type such as `Block.ViewBuilderFor<typeof FeatureComposition>`.

## Phase 3.3: Architecture sketch (Tier 4+ only)

For Tier 4+ apps (routing, domain modules, multiple entities, blocks) produce a compact sketch BEFORE generating implementations. Tier 1-3 apps are small enough to generate in one pass; Tier 4+ apps burn a lot of effort if the structure is wrong.

The sketch has five parts. Emit them inline in the conversation, get confirmation, THEN scaffold:

1. **File tree**: the exact paths you will create. Match Phase 3's organization.
2. **Model shape**: the top-level `Schema.Struct` fields and their types. Not the full schema, just the shape.
3. **Message list**: every Message you plan to define, grouped by category (clicks, inputs, commands, out-messages).
4. **Route list**: if routing, every `defineRouteUnion` variant with its params and the path it maps to.
5. **Domain operations**: for each file in `domain/`, the operations it will expose (`Link.byNewest`, `Link.filterByTag`, etc.).

Example for a Tier 4 link saver:

```
### Sketch

Files:
  src/definition.ts, composition.ts, entry.ts, model.ts, message.ts
  src/init.ts, command.ts, update.ts, view.ts, route.ts
  src/domain/link.ts, index.ts
  src/story.test.ts, scene.test.ts

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

This is optional but strongly recommended. The scaffolded `AGENTS.md` includes a `subtree_prompted: false` line that agents check on future sessions. If the subtree is absent and this flag is false, the agent offers to add it. Handling it up front here means the user's next AI session already has full context. If the user declines, update the line to `subtree_prompted: true` so they aren't asked again.

To re-pin the subtree after a Foldkit package upgrade, run the same command with `pull` in place of `add`.

### Replace the scaffold

Then replace the counter example. Keep `src/application.ts` only when the generated root remains genuinely compact. When the generated root is split, move every root responsibility to its named file and remove `src/application.ts`.

## Phase 3.7: Ground the Foldkit APIs

Before writing any code, READ the type signatures of every Foldkit module you will use. Guessing signatures wastes cycles: each wrong guess is a tsc error, a re-read, an edit, another typecheck. Five minutes of reading prevents thirty minutes of iteration.

### The exact files to read

For each Foldkit module you plan to use, read the `.d.ts` at the paths below. Read the public surface; you don't need the internals. Write a short signature crib in your working notes so you don't have to re-check while generating.

```text
# Every app
<project>/node_modules/foldkit/dist/index.d.ts          # top-level re-exports: the authoritative list of what `foldkit` exposes
<project>/node_modules/foldkit/dist/html/index.d.ts     # HtmlBuilder<Message>, element signatures, Attribute<Message>, inertHtml
<project>/node_modules/foldkit/dist/message/public.d.ts # defineMessageUnion()
<project>/node_modules/foldkit/dist/schema/public.d.ts  # defineTaggedUnion(), taggedStruct()
<project>/node_modules/foldkit/dist/struct/index.d.ts   # modifyFields(): check nested-update signature
<project>/node_modules/foldkit/dist/update/public.d.ts  # Update.Return, Update.ReturnWithOutMessage, Update.withOutMessage, Update.combineSteps, Update.refresh
<project>/node_modules/foldkit/dist/index.d.ts # public Block and Program exports
<project>/node_modules/foldkit/dist/runtime/runtime.d.ts     # Runtime.run, Runtime.hydrate, Runtime.embed

# If using routing
<project>/node_modules/foldkit/dist/route/public.d.ts   # defineRouteUnion, literal, slash, string, int, Route.root, Route.mapTo, Route.oneOf, Route.parseUrlWithFallback
<project>/node_modules/foldkit/dist/url/index.d.ts      # toString
<project>/node_modules/foldkit/dist/navigation/index.d.ts # pushUrl, load: all return Effect<void> (no Effect.ignore needed)

# If using async / side effects
<project>/node_modules/foldkit/dist/command/index.d.ts  # Definition.layer, Definition.toLayer, Command.mapMessages; use FeatureDefinition.makeCommand for owned Commands
<project>/node_modules/foldkit/dist/asyncData/public.d.ts # AsyncData: Idle/Loading/Refreshing/Failure/Stale/Success + Schema, match, isPending, hasData, revalidate
<project>/node_modules/foldkit/dist/http/public.d.ts     # Http.layer: provide it beneath handlers at the application root
<project>/node_modules/foldkit/dist/dom/index.d.ts      # focus, advanceFocus, scrollIntoView, showDialog, closeDialog, clickElement, lockScroll, unlockScroll, inertOthers, restoreInert, detectElementMovement, waitForAnimationSettled. For time/random/delay use Effect's Clock, Random, Effect.sleep + Duration directly. For UUIDs use Crypto.Crypto's randomUUIDv4 and provide BrowserCrypto.layer at the application root.

# If using subscriptions
<project>/node_modules/foldkit/dist/subscription/index.d.ts # Entry contracts used by FeatureDefinition.makeSubscriptions

# If using mount / managed-resource / custom-element
<project>/node_modules/foldkit/dist/mount/public.d.ts            # Mount contracts used by FeatureDefinition.makeMount / FeatureDefinition.makeMountStream: per-instance VNode lifecycle
<project>/node_modules/foldkit/dist/managedResource/public.d.ts  # Entry contracts and tag used by FeatureDefinition.makeManagedResources
<project>/node_modules/foldkit/dist/customElement/index.d.ts     # CustomElement.define: for typed bindings to native web components

# If the host application drives the program
<project>/node_modules/foldkit/dist/port/public.d.ts    # Port.inbound / outbound / emit / stream / subscription

# If using forms
<project>/node_modules/foldkit/dist/fieldValidation/public.d.ts # Field (tagged union), makeRules({required?, rules}), match, validate, allValid; rule constructors on the Rule namespace (Rule.url(options), Rule.email, Rule.minLength, Rule.pattern, Rule.fromSchema, ...)
# Rule.Rule is [Predicate, Rule.RuleMessage], NOT {test, message}. Field.Invalid has `errors: NonEmptyArray<string>`, not `error: string`.

# If using any UI component (SEPARATE PACKAGE)
<project>/node_modules/@foldkit/ui/dist/<component>/public.d.ts  # Model, Message, init, update, view (Block-shaped) or ViewConfig (render-helper-shaped), OutMessage when applicable
# Check: is it a Block (Menu/Listbox/Combobox/Calendar/DatePicker/Dialog/Popover/RadioGroup/Tabs/Tooltip/FileDrop/DragAndDrop/Slider/VirtualList/Toast) embedded via h.block, or a stateless render helper (Button/Input/Textarea/Select/Fieldset/Checkbox/Switch/Disclosure/Nav) called directly? Blocks carry their own Model/Message/update/OutMessage; render helpers don't. Check ViewInputs (for Blocks) or ViewConfig (for helpers) for the slot callbacks (toView, itemToConfig, etc.).

# If using dates
<project>/node_modules/foldkit/dist/calendar/index.d.ts # CalendarDate, today.local (returns Effect<CalendarDate>); for raw millis use Clock.currentTimeMillis
```

If a path above doesn't resolve, list the package's `dist/` and find the module. **The `.d.ts` is authoritative and this file is not.** Where the two disagree, the `.d.ts` is right and the disagreement is a bug in this skill worth reporting.

### What to record in the crib

For each symbol you'll call, write one line:

```text
h: HtmlBuilder<Message> (view parameter, supplied by the runtime): { div, input (VOID), textarea (VALUE-ONLY), button, Class, Href, For, Id, Role, OnClick(Message), OnInput(value=>Message), OnBlur(Message), OnSubmit(Message), keyed, empty, block, ... }
Route.mapTo(schema)(parser): curried
pushUrl(path): Effect<void>  // NOT fallible, no Effect.ignore needed
urlToString(url: Url): string
Update.Return<Model, Message>: { model: Model; commands?: ReadonlyArray<Command.Command<Message>>; outMessage?: never }
Command.mapMessages(commands: ReadonlyArray<Command.Command<ChildMessage>> | undefined, toMessage): ReadonlyArray<Command.Command<ParentMessage>>
AsyncData.Schema(DataSchema, ErrorSchema): { schema, Idle(), Loading(), Success({data}), Failure({error}), ... }
AsyncData.match(value, { onIdle, onLoading, onRefreshing, onFailure, onStale, onSuccess })
  // handlers take BARE values, except onStale:
  //   onIdle: () => B          onLoading: () => B
  //   onRefreshing: (data) => B     onSuccess: (data) => B
  //   onFailure: (error) => B       onStale: ({ error, data }) => B
FeatureDefinition.makeCommand(name, { args, messages, handler }): every input is a named field.
  The handler generator returns the production function, which receives the decoded args object
  directly, so you destructure the fields themselves; the call site passes args:
  const Fetch = FeatureDefinition.makeCommand('Fetch', {
    args: { id: Schema.String },
    messages: [Message.SucceededFetch, Message.FailedFetch],
    handler: function* () { return ({ id }) => ... },
  })
  const EffectsLayer = Fetch.layer
  update: [Fetch({ id })]     // NOT Fetch({ id })(effect)
Document: NOT generic, and `body` is a single Html, not an array
Input.view({ id, value, onInput, isInvalid?, type?, placeholder?, toView: (attrs) => Html }, h)
  // from '@foldkit/ui', NOT Ui.Input
  // attrs: { label: ReadonlyArray<Attribute<M>>, input: ..., description: ... }
Field (schema): NotValidated | Validating | Valid | Invalid(errors: NonEmpty<Rule Message>)
```

### Specific API pitfalls the generator hits repeatedly

Record these in the crib and keep them visible while generating:

- **`input` and `br` and other void elements take ONLY attributes**: `input([...])`, never `input([...], [])`. `textarea` also takes attributes only; set its content with `h.Value(text)`, never children or `h.InnerHTML`. `button` takes children.
- **The children argument is optional on elements that accept children.** Omit it when there are none: `div([Class('divider')])`, not `div([Class('divider')], [])`. Attributes stay required, so `div([])` is how an element with neither is written. `keyed` follows the element: `h.keyed('li')(key, [attrs])`, not `h.keyed('li')(key, [attrs], [])`; use `h.keyed('textarea')(key, [h.Value(text)])` without children.
- **`UrlRequest` tags are `Internal` and `External`**, not `InternalUrl` / `ExternalUrl`.
- **`OnClick` and `OnSubmit` take a Message directly**, not a `() => Message`. Only `OnInput` takes `(value) => Message` because it needs the input value.
- **`keyed`, `empty` are properties on the builder `h`** the view receives as its last parameter. They are not top-level exports of `foldkit/html`.
- **Attribute helpers are specific**: `Value(...)`, `Type(...)`, `Placeholder(...)`, `Href(...)`, `Target(...)`, `Rel(...)`, `Rows(n)`, `Id(...)`, `For(...)`, `Role(...)`, `AriaLabel(...)`. There is no generic `Attr('...', '...')`.
- **Author init and update through the named Composition.** Use `ApplicationComposition.makeInit(fn)` and `FeatureComposition.makeUpdate(cases)`. A non-routing root init receives Flags when declared. A routing root init receives Flags first when declared and `url: Url` last. The Composition owns the registered child graph, assembles configured child startup, routes generated child envelopes, and preserves exact arguments, requirements, and evidence for completion. Its exhaustive local handler record handles only the locally authored Message, while `FeatureComposition.Message` and `FeatureBlock.Message` expose the complete dispatch contract. Binding folds and projected operations require that exact graph when applied to a Model. Return or compose their opaque results intact from `makeUpdate` or `makeInit`, or preserve them through the Definition's `makeStep` producer. An authored update supports `update(model, message, ...context)` for dispatch and `update(message)(model, ...context)` as an internal Step. Do not invoke connected operations in a helper whose input is only the plain domain Model.
- **`Route.mapTo` takes the route schema, not a factory function.** `pipe(literal('new'), Route.mapTo(ApplicationRoute.NewLink))`. NOT `Route.mapTo(() => ApplicationRoute.NewLink())`.
- **`Effect.ignore` is ONLY for fallible Effects.** `pushUrl(path).pipe(Effect.as(Message()))`. No `Effect.ignore` because `pushUrl` returns `Effect<void>`.
- **`FeatureDefinition.makeCommand` stores the handler generator in its config**: `const Fetch = FeatureDefinition.makeCommand('Fetch', { messages: [Message.SucceededFetch, Message.FailedFetch], handler: function* () { return fetch } })`. Foldkit applies `Effect.gen` internally. Definitions have no `execute` field. `messages` is required and is always an array, even for one Message. Merge `Fetch.layer` into the owning module's `EffectsLayer` export. Omit `handler` only for a contract whose implementation belongs to an external host; its Fetch contract remains in `hostHandlers` until `provideHandlers` supplies it and the host uses `toLayer` with an Effect constructor.
- **`makeRules` takes `{ required?: Rule.RuleMessage, rules: Array<Rule.Rule> }` where `Rule.Rule = [Predicate, Rule.RuleMessage]`**: a tuple, NOT `{ test, message }`. Rule constructors live on the `Rule` namespace (`Rule.url({ message })`, `Rule.email(message?)`, `Rule.minLength(n, message?)`, `Rule.pattern(regex, message?)`, `Rule.fromSchema(schema, message)`).
- **`Field.Invalid` has `errors: NonEmptyArray<string>`, not `error: string`.** Use `Array.headNonEmpty(errors)` to get the first message; use `Rule.resolveMessage(message, value)` to resolve a rule message to its final string.
- **Route variants stay on `ApplicationRoute` and drop the repeated `Route` suffix.** Write `ApplicationRoute.Home` and `ApplicationRoute.NewLink`, not sibling bindings named `HomeRoute` and `NewLinkRoute`.
- **Routers are callable for printing**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. Never hand-construct URLs.
- **UI components come from `@foldkit/ui`, not from a `Ui` namespace on `foldkit`.** `import { Dialog, Input } from '@foldkit/ui'`, then connect Dialog and call Input's stateless view helper. There is no `Ui` export on the `foldkit` package.
- **`HttpClient` and `HttpClientRequest` come from `effect/http`**, not `@effect/platform`. Leave `HttpClient.HttpClient` in the handler's requirements and provide `Http.layer`, imported from `foldkit`, at the application root. This keeps the real handler reusable with a deterministic HTTP Layer in an execution test. `@effect/platform-browser` is a different thing, used for `BrowserKeyValueStore` and `BrowserCrypto`.
- **Register each selected child Binding once.** Binding construction is passive;
  registration in the parent's Composition enables routing and contributes the
  child's lifecycle and handler graph. Use the narrowest storage form and
  declare startup ownership explicitly. Read
  [Block composition and Layers](../foldkit/references/composition.md) for the
  storage, routing, OutMessage, startup, sibling policy, view, and Layer decision
  tables. Apply its review invariants before completion.
- **Let `FeatureComposition.makeUpdate` infer Command requirements.** Pass an exhaustive handler record for per-Message outputs, or use `makeUpdate.withContext(context => handlers)` when handlers need dispatch context. Registered Bindings route generated child envelopes before the local Message handler record. Put the local Message constructor directly under `operations` for a public operation that forwards its payload into that Message. Completion creates the callable operation without constructing a Message. A constructor with fields takes one constructor payload object followed by update context, with constructor defaults honored; an empty-fields constructor takes no payload placeholder. Keep a tuple producer under `operations` when public inputs need mapping, refinement, defaults, or an exact context tuple. Both operation forms pass the Message through update synchronously, retain the selected handler's Command requirements and OutMessage type, and never enqueue another Runtime Message. Use `InformedOf*` for parent notifications and `Requested*` for requested actions. Calling a pure operation does not run effects returned by another branch. Use the owning `makeStep` helper or a standalone Step only for internal composition. When another matcher, helper, or exported signature needs an `UpdateReturn` alias and any branch returns Commands, derive the relevant requirements with `Update.RequirementsOf<typeof update>`. Pass them to `Update.Return<Model, Message, Requirements>` or `Update.ReturnWithOutMessage<Model, Message, OutMessage, Requirements>`. The match generic constrains the whole matcher, so omit a redundant return annotation. Use `Match.withReturnType<UpdateReturn>()` only for Effect `Match`.

Parent-facing operation names describe the communication: `requestCloseMenu` produces `Message.RequestedCloseMenu`, `informJoined` produces `Message.InformedOfJoin`, and `informRouteChanged` produces `Message.InformedOfRouteChange`. Use `request*` for actions and `inform*` for notifications. Both enter child update; avoid silent `reflect*` Model synchronization. Keep an actual UI fact separate when it represents a different event.

- **Preserve the plain-return OutMessage guard.** Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected. The missing field means that update emitted no OutMessage. A hand-written plain-return type must preserve the `outMessage?: never` field.
- **Omit only statically empty Commands.** A producer with statically no Commands omits `commands`. A producer with a computed collection returns it without checking whether it is empty. Never write `commands: []`.
- **Keep ordinary update-like results together.** When a result already contains a Model and optional Commands or OutMessage, bind it to a value named after the operation and use dot access. Use a trailing underscore such as `init_` when the operation name collides with the function. Do not destructure or rename `model`, `commands`, or `outMessage`. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`. Pass optional Commands directly to `Command.mapMessages`; use `result.commands ?? []` only when the next operation requires a concrete array. Dot access keeps the operation and all of its returned fields visible together but does not prevent someone from ignoring `outMessage`.
- **Keep Binding initialization recipes intact.** `Binding.init({ key?, args, toParentModel, commands? })` returns a passive, noncallable recipe with no `.model` or `.commands` fields. Return it directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through the parent's `makeStep` producer. A completed operation may dispatch a Message whose update branch returns the recipe. Runtime frame and placement checks still protect erased JavaScript and captured operations.
- **Keep connected results opaque.** A Binding fold or named operation is a connected Step whose Model input requires its exact registered graph. Typed raw-Model calls fail, and its opaque result cannot narrow to a useful `{ model }` return or expose `.model` or `.commands` before checked execution. Return or compose it intact so `Composition.makeUpdate`, `Composition.makeInit`, or a completed operation can consume it. The raw recipe exposes only direct channels; the Composition resolves registered OutMessage policy and sibling operations into the final parent Command Message, requirements, and OutMessage channels. Derive exported parent contracts from the Composition-authored update or completed Block. A completed `FeatureBlock.operations.operation(model, ...args)` is a checked raw-Model executor and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript can erase a function result through a method returning `void`; outside the graph, invoking that erased method only constructs and discards passive configuration and executes no child work. Do not claim that every structural erasure fails compilation.
- **Use the update combinators for their full patterns.** Use `Update.combineSteps` when two or more Steps must run in sequence over one Model. Call a single Step directly.
- **Build parent-owned OutMessage policy through the parent Definition.** Keep an ordinary unkeyed policy fluent and inline: `makeBinding(ChildBlock, ...).withOutMessagePolicy({ fold: FeatureDefinition.makeOutMessageFold(ChildBlock, handlers), forward: FeatureDefinition.makeOutMessageForward(handlers) })`. Every fold passes the whole completed child explicitly, whether inline, extracted, adapted for keyed policy, or staged for self-referential or reciprocal composition. Forwarding remains contextual when inline; pass the whole completed child to `makeOutMessageForward` when extracting or adapting it. Name every child variant directly; missing and extra handlers fail type checking. Fold Steps preserve inferred Command requirements and sibling Binding evidence for Composition to check. A forward handler returns a declared parent OutMessage or `undefined`, and at least one variant must continue upward. Do not repeat Step, payload, or Model types. Take the inferred `FoldContext` as a fold handler's second argument only when using `liftCommand` or `modelBeforeUpdate`. Register the policy-selected Binding. Do not use a raw child matcher, annotations, casts, or generic argument lists as an inference workaround.
- Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

- Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names.

- In a split feature, export the Step helpers used by the implementation from `definition.ts` and named-import them in implementation modules. In a colocated feature, destructure those helpers beside the Definition in the scope that uses them. Keep Definition-qualified calls when several Definitions in one module need visible ownership. Feature barrels keep authoring helpers private and export the completed Block.

- All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

- Use `makeStep.fromMessage(message => stepOrResult)` when only the Message is needed to select or construct a composed Step or initialization recipe. The returned handler stays Model-first, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`.

- Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

- `Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.
- **Branch on a Model array with `Array.match`, not the predicates.** `Array.isArrayEmpty` and `Array.isArrayNonEmpty` (note the names: not `isEmptyArray` / `isNonEmptyArray`) take a mutable `Array<A>`, so neither compiles against the `ReadonlyArray` an `Schema.Array(...)` field decodes to. `Array.match` takes `ReadonlyArray` and is what the exemplars use.
- **`empty` and `keyed` are properties on `h`**, so they are never in the `foldkit/html` import list. Import the types (`import type { Document, Html, HtmlBuilder } from 'foldkit/html'`) and reach for `h.empty` / `h.keyed` off the view's builder.

## Phase 4: Generate the App

Generate files following the architecture and conventions guides exactly. Write all source files into the scaffolded project's `src/` directory. For each file, follow these rules:

### Model

- Define the Model with Effect Schema. Use `Schema.Struct` for a record and a tagged union for distinct states.
- For one child occupying a complete parent tagged-union variant, use `makeVariantBinding` from `foldkit/variantBinding`. The parent `Schema.Union` directly includes that exact `ChildBlock.Model` Schema; tags are required, literal and distinct. Parent update owns variant switches and dynamic `Binding.init`, including Commands. The helper never creates an absent child. Keep general accessors for nested/wrapped variants and custom writes; use ordinary registered OutMessage policy and exact delivery context.
- Use discriminated unions for state: `Idle | Loading | Error | Ok`, never booleans for multi-valued state
- Use `Option` for fields that may be absent. Never empty strings or null
- Prefix Option-typed fields with `maybe`: `maybeCurrentUser`, `maybeError`
- Suffix Model fields containing `AsyncData` values with `AsyncData`: `weatherAsyncData`, `workspaceAsyncData`. A Query Model is a child Block Model, not an AsyncData value; do not add this suffix to Query Model fields.
- For remote data, use the `AsyncData` module rather than hand-rolling a union. `AsyncData.Schema(WeatherData, Schema.String)` returns `{ schema, Idle, Loading, Refreshing, Failure, Stale, Success }`; put `schema` in the Model and build values with the constructors. The `Refreshing` and `Stale` states are the point: they let a reload keep the current data on screen, and a failed reload keep it rather than discarding it. `repos/foldkit/examples/weather/src/model.ts` declares the AsyncData contract; its `update.ts` demonstrates state transitions. Read `AsyncData.match`'s signature before calling it: the handlers take bare values (`onSuccess: data => ...`, `onFailure: error => ...`), except `onStale`, which takes `{ error, data }`
- When several update paths share cached fetch, refresh, reset, and stale-response behavior, consider experimental `Query.define`. Query and KeyedQuery are completed viewless Blocks: bind them through the parent Definition, register the Binding in `bindings`, and call loading operations through that Binding inside the owning Composition context. Preserve Query's generated `Fetch`, canonical `query.EffectsLayer` or explicit host `provideHandlers`, constructor error and Service requirements, request generations, and cache key type. A KeyedQuery's entries are cache data inside one Query Model, not keyed child Block occurrences. `repos/foldkit/examples/api-cache-query/` is the reference.
- For non-remote multi-valued state (form steps, editor modes, connection phases), declare the whole union with `defineTaggedUnion()`. See Discriminated Unions for State in [conventions.md](conventions.md)
- For apps with multiple domain entities referenced across modules, extract shared schemas into `src/domain/` (e.g., `domain/product.ts`, `domain/session.ts`). See the shopping-cart and auth examples for this pattern, and read `${CLAUDE_SKILL_DIR}/../../packages/website/src/page/projectOrganization.ts` for guidance on when and how to structure domain modules

### Messages

Declare the whole Message union with `defineMessageUnion()`:

```ts
export const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
  SucceededLogin: { user: User },
  FailedLogin: { error: Schema.String },
  CompletedFocusInput: {},
})
```

When an explicit local annotation needs the decoded union, write `typeof Message.Type` directly. Owned Definition, Composition, and completed Block helpers infer it from the Schema value, so do not add or export a routine colocated alias. Construct variants through the namespace, such as `Message.ClickedSubmit()` and `Message.UpdatedEmail({ value })`. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Name messages by category:

- `Clicked*`: button/link clicks
- `Updated*`: input value changes (with `{ value: Schema.String }`) and external state updates from subscriptions (`UpdatedRoom`, `UpdatedPlayerProgress`)
- `Submitted*`: form submissions
- `Succeeded*` / `Failed*`: paired, for commands that can meaningfully fail
- `Completed*`: every other Command result, named from the Command (verb+object: `CompletedFocusInput`, `CompletedGenerateCardId`)
- `Pressed*`: keyboard input
- `Blurred*`: focus loss
- `Selected*`: choice made from a list
- `Toggled*`: binary state flip

Every message must carry meaning. No `NoOp`.

### Flags (if the initial Model needs side effects)

- Define a `Flags` Schema for data the initial Model needs from side effects
- Define `flags` as an `Effect<Flags>` that computes the values (localStorage reads, current time, etc.)
- For a page-owning application, declare `Flags` in `Program.make` and pass `flags` to `Runtime.run(program, { flags })` for a fresh browser boot. For an Element, declare both `Flags` and `flags` in `Program.makeElement`. Hydrated applications call `Runtime.hydrate(program)` and use only the server-encoded Flags payload. `@foldkit/vite-plugin` compiles the shared deployment identity into Foldkit for coordinated client and server builds
- Pass the result into init. Never perform side effects at module level or inside init directly
- See the Flags section in [architecture.md](architecture.md) for the full pattern

### Init

- Author init through the owning Composition: `const init = ApplicationComposition.makeInit(fn)` or `const init = FeatureComposition.makeInit(fn)`. Return only parent-owned Model fields when Bindings declare startup. The Composition assembles child fields and preserves the callback's exact arguments, requirements, and evidence for completion
- Give init one concrete function signature. Optional, default, and rest parameters are supported. Wrap an overloaded helper or callable object in a concretely typed callback. In a generic Block factory, capture the factory type parameters outside init instead of making the initializer itself generic
- Return an `Update.Return<Model, Message>` record. Omit `commands` when init statically creates no Commands; return a computed Commands collection directly
- If Flags are used, accept them as the first parameter. For example: `(flags: Flags) => ({ model: initialModel(flags) })` or `(flags: Flags, url: Url) => ({ model: initialModel(flags, url) })`
- Include startup Commands (initial fetch, focus first input, etc.)
- Construct a `Schema.Struct` Model with `Model.make({ field: value })`. Message, OutMessage, Route, and tagged-union variants remain callable through their owning namespace. When Composition init assembles child fields, return the plain record of parent-owned fields instead of constructing an incomplete Model
- Let init construct the baseline Model and return any initial Commands. Optional `boot` helpers are ordinary initial Steps called through a Binding after the child Model exists; Foldkit has no special Runtime boot phase, and a feature need not define both init and `boot` helpers. When an existing operation such as `requestOpen` or `requestRestore` describes startup, list its Binding-projected Step in the init plan. The operation produces a truthful Message that update handles. Return an explicit `Binding.init` recipe intact so Composition retains and lifts the child Commands. Call one Step directly and use `Update.combineSteps` only for two or more sequential Steps.
- For zero-or-one keyed child storage, use an exact required `Schema.Option` field containing one closed wrapper with its stable key and exact child Model. Bind it with `field`, `key`, and `childField`. `None` remains absent and child folds or operations never create it. Create it explicitly with `Binding.init({ key, args, toParentModel })`; automatic `init.instances` applies only to keyed arrays.

### Update

- Author Block updates with an exhaustive `FeatureComposition.makeUpdate` handler record. This preserves each handler's requirements and routes generated child envelopes before local handlers run. Use `FeatureComposition.makeUpdate({})` when the Block has no locally authored Messages, and `makeUpdate.withContext(context => handlers)` when handlers need dispatch context.
- Use `update(message)(model, ...context)` when applying an authored update as an internal Step. Public operations are Message producers instead of Steps. Keep the owning `makeStep` helper or a standalone Step for internal parameterized composition. `Update.combineSteps` accepts unary Steps, so adapt a required-context update with an explicit unary function that supplies every context argument.
- Name every locally authored Message tag in that record and let Composition contextually type the Model and exact Message variant. Pass compatible Steps or dedicated `handle<MessageTag>` functions directly. Declare a named public operation with a local Message constructor or a tuple producer under `operations`; do not put arbitrary Steps in that registry. When another matcher or exported signature needs an explicit requirement union, derive child update requirements with `Update.RequirementsOf<typeof childUpdate>` and include requirements from any other Command-producing helper. Do not derive update requirements from `Layer.Success<typeof EffectsLayer>` because that bundle may also implement Subscriptions, Mounts, or ManagedResources. Every child fold calls `FeatureDefinition.makeOutMessageFold(ChildBlock, handlers)` with the whole completed child explicitly, whether inline, extracted, adapted for keyed policy, or staged for reciprocal composition. Name every variant directly and let the parent Definition infer result channels and handler context. A hand-written plain-return type is equivalent only when it includes `outMessage?: never`. Never switch. Use a `defineTaggedUnion` or `defineRouteUnion` namespace's `matchOrElse` for partial matches with fallbacks. Keep Effect `Match` for nested partial matches, handlers shared across several tags, and unions without their own matcher
- Omit `commands` when an update, init, Step, or component helper statically creates no Commands. Return a computed Commands collection directly without checking whether it is empty. Never write the literal `commands: []`
- When composing an update, Step, or component helper result, bind the whole result to a value named after the operation and use dot access. Use a trailing underscore such as `init_` when the name collides with the function. Do not destructure or rename `model`, `commands`, or `outMessage`. Name a child fold's `write` parameter after the next child Model. Pass optional Commands directly to `Command.mapMessages`, and use `result.commands ?? []` only where the next operation requires a concrete array. Dot access keeps the operation and all of its returned fields visible together but does not prevent someone from ignoring `outMessage`. Return a Binding init recipe intact from its interpreting boundary. Use the child Binding's `init`, `fold`, or named operation.
- Use `Update.combineSteps` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combineSteps`; call that operation directly. Name an inline Step parameter `stepModel` when combining several. When the OutMessage is already known while constructing a new result, include it directly. Use `Update.withOutMessage` for an existing plain return or a value with the type `OutMessage | undefined`: pipe an existing return into the helper, and pass a new result literal first. Build child folds and forwards with the owning Definition helpers, then select them through `withOutMessagePolicy`
- Use `modifyFields(model, { field: () => newValue })` for immutable updates
- When a `Succeeded*` handler has to write several caches and kick off refetches, sequence them with `Update.combineSteps(model, [step, step, ...])` and build the refetch steps with `Update.refresh({ read, revalidate, write, load })`, which reloads a cache only when it actually holds data. `examples/route-transitions/src/update.ts` shows both
- In `modifyFields`, use point-free field transformers when the update only depends on that field's current value: `items: Array.map(updateItem)`, `count: Number.increment`. Use `() => value` for replacement values from Messages, child updates, Commands, or other Model fields. Change a child Block Model only through its update; parent notifications call a bound `inform*` operation that produces an `InformedOf*` Message.
- Extract complex handlers to separate functions when a case exceeds ~15 lines
- For Blocks, return `Update.ReturnWithOutMessage<Model, Message, OutMessage>`. Omit `outMessage` when there is nothing to report
- See the OutMessage pattern in [architecture.md](architecture.md). Child modules signal to parents through `outMessage`; the parent selects an exhaustive callable fold or forward through the Binding's `withOutMessagePolicy` method.

### Commands

- Define owned Command identities with `FeatureDefinition.makeCommand`, whose config declares `args` (optional), `messages`, `interrupt` (optional), and `handler`. The handler is a generator constructor; Foldkit applies `Effect.gen` internally. Service lookups in the generator run once when the application Layer is built, and the returned function runs afresh for every Command invocation with its current args. Definitions omit `execute`. Compose `Fetch.layer` directly in the owning module's `EffectsLayer`. A constructor with no service lookup still uses `handler: function* () { return args => effect }`. Update returns `Fetch({ id })`. Create a standalone `FetchLayer` binding only when that individual provider is intentionally public or independently reused outside `EffectsLayer` composition. Omit `handler` only for an external host contract and pass the host's constructor Effect to `toLayer` at that boundary
- To make a Command interruptible, add `interrupt`. `interrupt: true` keys every invocation by the Command name; `interrupt: { keyFields, toKey }` selects the args that identify an invocation and derives its key so concurrent invocations can be cancelled independently. The selected fields become the args required by the Definition's `Interrupt` constructor
- Always assign definitions to PascalCase constants. Never inline in pipe chains
- Definitions live in the feature whose update produces them, alongside update or in a feature-local `command.ts`
- Let TypeScript infer return types. No explicit `Command<typeof A>` annotations
- Use `Effect.gen` for multi-step async
- Convert expected failures with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. **Exception:** if the Effect is infallible at the type level (`Clock.currentTimeMillis`, `Random.nextIntBetween`, etc.), no `catch` is needed and no `Failed*` Message is needed. Follow the types: if there's no error channel, there's nothing to catch. Defects may follow the runtime's crash path.
- Use `Effect.provide` inside a handler only when the operation deliberately owns a private per-execution service and the application should not substitute it. Put a shared business service defined by the owning module beneath its handler Layers with `Layer.provide`. Leave concrete HTTP, storage, RPC, and browser providers open for the application root. Use `Layer.provideMerge` there when the provider must stay exposed to Flags or another application consumer
- Name each Command for the effect its handler performs, not the later Model transition caused when update handles its result. A timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`
- Commands that can't meaningfully fail return `Completed*` Messages named from the Command, payload-carrying ones included: `DetermineStartTime` → `CompletedDetermineStartTime`, not `DeterminedStartTime`
- Use Foldkit's `Dom` module for DOM operations (`Dom.focus`, `Dom.scrollIntoView`, `Dom.showDialog`, `Dom.lockScroll`, etc.) and Effect built-ins for everything else (`Clock.currentTimeMillis`, `Random.nextIntBetween`, `Effect.sleep(Duration.millis(...))`). For UUIDs, use the `Crypto.Crypto` service's `randomUUIDv4` with a platform Crypto layer. See DOM and Effect Helpers in [architecture.md](architecture.md)
- For HTTP requests, use `HttpClient` and `HttpClientRequest` from `effect/http`. Leave the client in the handler's requirements and provide `Http.layer` from `foldkit` at the application root. See `examples/weather/src/command.ts` for the handler, `examples/weather/src/services.ts` for the root provider, and `examples/weather/src/entry.ts` for application provision
- Let the child Binding capture generated delivery and origin for child Commands. Use `Command.mapMessages` directly only for lower-level operations outside a composed Block.

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

const Model = Schema.Struct({
  name: Field(Schema.String),
  email: Field(Schema.String),
  // ...
})
```

`Field(valueSchema)` builds a tagged union: `NotValidated | Validating | Valid | Invalid`. The value Schema should match what the control actually holds as the user edits, not the type you parse it into: `Field(Schema.String)` for text inputs, `Field(Schema.Array(Schema.String))` for a multi-select. A checkbox's boolean usually stays plain `Schema.Boolean` in the Model unless it needs the validation lifecycle. Rules stay separate in `makeRules`. Use `validate(rules)(value)` in update handlers to transition a field, and gate submission with `allValid([[state, rules], ...])`, which gates one field value type per call (combine calls with `&&` across types). Omit `required` from `makeRules` to make a field optional.

Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/form/src/update.ts` and `command.ts` (async email uniqueness check with version-based cancellation) and `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/` (validated multi-step forms across Blocks).

### Dates and File Uploads

For date handling (birthday, deadlines, scheduling):

- Use the `Calendar` module: `Calendar.CalendarDate`, `Calendar.today.local` (Effect returning today's date in the user's timezone), `Calendar.make(year, month, day)`, `Calendar.addDays`, etc.
- Use `DatePicker` (input + popover calendar) or `Calendar` (inline grid) from `@foldkit/ui` for the UI
- Seed the initial date via Flags when needed. See `job-application` example, which uses `Calendar.today.local` in its Flags Effect

For file uploads (resumes, images, attachments):

- Use the `File` module for file primitives
- Use `FileDrop` from `@foldkit/ui` for a drag-and-drop + click-to-browse zone with validation
- `FileDrop.ReceivedFiles` carries `files: NonEmptyArray<File>`, so the happy path never has to handle an empty list. A drop that produced no files arrives as the separate `RejectedNonFiles` OutMessage; handle it to surface a message like "Only files are accepted"
- Canonical reference: `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/step/attachments/`

### View

- Every view receives `h`, the typed Html builder, as its last parameter. Define the completed view through its Composition's `makeView`. Application code never constructs a builder. The child dispatches in its own Message type, and the parent uses `binding.embedView` so the canonical view and generated delivery provenance come from the same placement.
- Ordinary feature-local view helpers are plain functions. Immediately after establishing `FeatureComposition`, with no blank line, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` and use the alias for their `h` parameter. Export it only when another file uses it. The owner prefix identifies one Composition's capabilities at plain type import sites; keep the internal structural contract names `Model`, `Message`, and `OutMessage`, while the completed `FeatureBlock` owns their public surface. The alias carries the feature Message plus registered child and Mount capabilities without constructing a runtime builder. Give each helper only the Model, domain value, or context parameters it uses; let its output infer. Genuinely shared helpers take the framework's general `HtmlBuilder<Message>` form last, preserving capability generics when they forward attributes, callbacks, children, or Mounts. Inside a view, always use the view's own `h`. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih` (typed `HtmlBuilder<never>`, so no handlers can be built with it).
- Use `h.Class(...)` for Tailwind classes
- Use `clsx` from the `clsx` package for conditional class composition: `h.Class(clsx('base-classes', { 'active-class': isActive, 'bg-blue-500': variant === 'Primary' }))`. Use `clsx` whenever classes depend on model state, boolean flags, or discriminated union tags. Never string concatenation, template literals, or `&&` expressions.
- Pattern match on model state through the union: `State.match(model.state, {...})`
- Use `Option.match` for conditional rendering based on Option fields
- Never key branches. View functions are the differ's identity boundaries; the vite plugin brands each function's return, so switching branches that render through different view functions replaces the subtree. Extract a same-tag inline ternary into named view functions when switching must reset DOM state
- Delegate complex sections to extracted view functions
- Wire events to Messages: `h.OnClick(Message.ClickedSubmit())` (a Message directly, not a callback), `h.OnInput(value => Message.UpdatedEmail({ value }))` (a callback that maps the value to a Message)
- Use Foldkit UI components when the interaction matches (Dialog for modals, Tabs for tabbed content, etc.)
- Keep comments sparse. Use a section header only for a substantial group in a long file, and a `// NOTE:` only for a timing dependency, browser quirk, or external constraint that clear names cannot express. Do not narrate ordinary update branches, handler bodies, or view construction

### Runtime Wiring

- Create the root with `Block.makeDefinition('Application', { Model, Message })`. Retain `ApplicationDefinition` when root authoring methods use it, then create `ApplicationComposition` from that value. When its only use is `makeComposition`, chain both calls in the module-level `ApplicationComposition` declaration. Pass `{ bindings?, mounts? }`, or use `makeComposition()` when the graph is empty. Author `init`, `update`, and `view` through that Composition, return `ApplicationComposition.prepareBlock({ init, update, view, ... })` from the private `prepare` producer, then export the annotated `ApplicationBlock = Block.assemble(prepare)`. The root Block must not leave an OutMessage for the Program to discard.
- Use `Program.make({ block: ApplicationBlock, container, Flags?, routing?, ...hostOptions })` for an app that owns the page. Its root view returns a `Document` (`{ title, lang?, dir?, canonical?, ogUrl?, body }`). Add routing at this host boundary. Prefer `onUrlRequest: ApplicationBlock.Message.ClickedLink` and `onUrlChange: ApplicationBlock.Message.ChangedUrl` for the canonical `{ request }` and `{ url }` payloads; use callbacks for custom payload shapes. Derive `canonical` from the typed route in the Model, never from the address bar.
- Development inspection is enabled when `devTools` is omitted, while external Message Schema discovery and dispatch are disabled. Add `devTools: { dispatch: true }` only when external DevTools clients should dispatch the completed root Block's Messages. Foldkit derives that Schema from `ApplicationBlock.Message`, including generated child envelopes. Decoding Services then become Program requirements; supply any remaining requirements through `program.provide`. Dispatch does not provide them. Use `devTools: false` to disable the DevTools store, overlay, and browser bridge together.
- Use `Program.makeElement({ block: ApplicationBlock, container, Flags?, flags?, ...hostOptions })` for a widget embedded on a page it does not own. Its root view returns `Html`, and the Runtime never touches the document `<head>` or the `<html>` element. It has no `routing` config.
- See the With and Without URL Routing section in [architecture.md](architecture.md) for the full pattern
- Include `ClickedLink` and `ChangedUrl` Messages for programs with routing, with proper `UrlRequest.Internal` / `UrlRequest.External` handling in update
- Each Block passes its local `EffectsLayer` to `FeatureComposition.prepareBlock`. Bindings in `bindings` add their handler graphs and lifecycle registrations automatically. Export completed values as `FeatureBlock` and `ApplicationBlock`. An ordinary feature barrel exports that completed Block with the matching checked producer/header annotation; its Model stays internal; reusable Schemas and pure utilities use an explicit domain barrel. Scene, Story, and focused lifecycle tests can deep-import private implementation owners without expanding the public barrel. `ApplicationLayer` contains ordinary Services and enters through `program.provide(ApplicationLayer)`. Program host configuration does not repeat init, update, view, lifecycle declarations, or `EffectsLayer`.
- A genuinely compact root exports `ApplicationBlock` from its all-in-one `application.ts`. A split root exports a reused `ApplicationDefinition` from `definition.ts`, or keeps the top-level factory chain in `composition.ts` when no authoring method needs it. It exports `ApplicationComposition` from `composition.ts`, assembles `ApplicationBlock` in `block.ts`, and has no root `application.ts`. `entry.ts` imports the Block, chooses the container and startup inputs, creates the Program, supplies `ApplicationLayer` through `program.provide(ApplicationLayer)`, and calls `Runtime.run`.
- `program.provide(layer)` returns a new passive Program. The supplied Layers build once when a Runtime starts it, including a restored-Model start, before a fresh Flags Effect, init, or the first render. Command lookup, Subscription restart, Mount insertion, and ManagedResource reacquisition reuse those app-scoped handlers and providers. `Runtime.hydrate` validates the server handoff before acquiring Layers. A Layer construction failure stops startup before the first render. The Runtime releases the Layer Scope when that start stops
- Give definitions distinct local handler names within one named Block. Different named Blocks may reuse a local name because ownership keeps their contracts separate. `FeatureComposition.prepareBlock` checks the local `EffectsLayer` and declared `hostHandlers`, and parent composition carries those checked contracts to the root. When an explicit type annotation is needed, derive the complete contract with `Command.HandlerOf<typeof Definition>`, `Subscription.HandlerOf<typeof subscriptions.entry>`, `Mount.RequirementsOf<typeof Definition>`, or `ManagedResource.HandlerOf<typeof managedResources.entry>`; never write a name-only `Handler<Name>`. An alternate implementation uses the original definition's `toLayer`.
- Keep four lifetimes distinct: application services such as RPC clients last for one Runtime start; one Command Effect lasts for one dispatch; Subscription Streams and ManagedResource handles follow Model conditions; Mount acquisition follows one DOM element. Keep the `ManagedResource` name for the Model-scoped handle primitive
- A definition's handler generator captures application services. It must not capture current time, Command args, Subscription dependencies, a DOM element, or an active ManagedResource handle. Service lookup retrieves the instance built for that application start; it does not construct the provider
- Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view
- A page-owning Program with Flags declares `Flags` in `Program.make` and passes the Flags Effect to `Runtime.run(program, { flags })`. A self-contained Element declares both `Flags` and `flags` in `Program.makeElement`. Requirements of either Flags Effect can be supplied through `program.provide`
- Start a page-owning app with `Runtime.run(program.provide(ApplicationLayer), { flags })`, omitting the options argument when there are no Flags. When a host application controls the Program's lifecycle, call `Runtime.embed(program.provide(ApplicationLayer))` and hand the returned handle to the host; mirror `repos/foldkit/examples/embedding/src/host.ts` for the host side and its `application.ts` for the widget side.
- Name the root stages `ApplicationDefinition`, `ApplicationComposition`, and `ApplicationBlock`, and the completed runtime input `program`

### Routes (if multi-page)

- Use bidirectional parser: `defineRouteUnion()`, `string()`, `int()`, `literal()`, `slash()`, `Route.mapTo()`, `Route.oneOf()`
- Declare every route in one `defineRouteUnion({ Home: {}, NewLink: {}, NotFound: { path: Schema.String } })` named `ApplicationRoute`. Keep each variant on that namespace: `ApplicationRoute.Home`. Do not destructure variants or repeat the old `HomeRoute` suffix.
- When a Model or Schema accepts only part of `ApplicationRoute`, use `ApplicationRoute.subset(['Home', 'Person'])`. It includes only the tags named in the call. There is no `omit`, because an exclusion list would silently accept every Route added later. When an annotation needs one variant's type, use `typeof ApplicationRoute.Person.Type` directly rather than adding a routine `PersonRoute` alias.
- Build each route as a Router: `const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))`. **Routers are callable**: `homeRouter()` returns `'/'`, `tagFilterRouter({ tag: 'foo' })` returns `'/tag/foo'`. This is the print side of the bidirectional parser.
- **Never hand-construct paths with template strings.** `Href(homeRouter())` not `Href('/')`. `pushUrl(newLinkRouter())` not `pushUrl('/new')`. `Href(tagFilterRouter({ tag: tagName }))` not ``Href(`/tag/${encodeURIComponent(tagName)}`)``. The router handles encoding and keeps the URL shape in one place so a refactor changes one file, not every call site.
- Render each route through its own view function; identity handles the switch, so route branches are never keyed. Key by entity id only when one shared view function renders different entities across route params (a detail page across slugs)
- Use `pushUrl` from `foldkit/navigation` in Commands for programmatic navigation. In the `ClickedLink` handler's `Internal` case, use `urlToString(url)` from `foldkit/url`. Never reconstruct the URL from `url.pathname + search + hash` manually; that path drops the `?` prefix and hash silently.
- In the `ClickedLink` handler, **don't pre-update `model.route`**. The runtime fires `ChangedUrl` after `pushUrl` resolves, which updates the route. Pre-updating creates a double-write.

### Subscriptions (if real-time)

- Define all Subscriptions owned by one Block in one `FeatureDefinition.makeSubscriptions(entry => ({ roomUpdates: entry('RoomUpdates', fields, { messages: [Message.ReceivedRoomUpdate], modelToDependencies, handler: function* () { return dependencies => stream } }) }))` registry. Add entries to that record and extract substantial Stream implementations into helpers instead of creating another registry for the same owner. Distinct child Blocks retain their own registries. The stable handler name identifies the Layer requirement, while the record key identifies the runtime registration and Stream scope. Several connected registrations can share one definition and Layer while retaining distinct placement-qualified keys. `messages` is the exact Message Schema collection the handler can emit; `messages: []` requires a silent `Stream<never>` whose acquisition and cleanup stay inside the Stream scope. When Subscription declarations are split from Block assembly, that module exports the Block's one registry. Compose `Feature.subscriptions.layer` in the owning Block’s `EffectsLayer`, or pass `EffectsLayer: subscriptions.layer` directly to `prepareBlock` when the registry supplies every local handler. The registry `.layer` is available when all entries have attached handlers; it is absent for mixed host contracts and the entry key `layer` is reserved. Use an individual entry’s `.layer` only for selective assembly. Use `Subscription.aggregate` only at graph, adapter, or test boundaries that join independent records.
- `modelToDependencies` extracts Subscription parameters from Model
- Child Bindings lift Subscriptions automatically. Use direct-field `presentWhen` when parent policy gates the whole child. Put placement-specific Stream-only policy in `subscriptions.when`; use a keyed `makeBinding` configuration for dynamic collections.
- The `handler` generator constructs a Stream function limited to the declared `messages`. Scene uses those declarations to validate both the selected `Subscription.emit` source and its Message Schema before applying lift mappings. A dependency change invokes the returned function with the latest dependencies and restarts the Stream scope without reconstructing the handler or its providers. Subscription lifecycle entries in DevTools are follow-up work. Omit `handler` only for an external host contract and pass the host's Stream-constructor Effect to `toLayer` at that boundary
- Subscriptions auto-start/stop based on Model state. Never manually managed
- For Subscriptions with no local Model dependencies, use `entry('KeyboardPresses', { messages: [Message.PressedKey], handler: function* () { return () => stream } })` with no dependency fields or callback; a parent can still gate the entry when lifting it
- Child Bindings collect and lift Subscriptions automatically. A direct Option field's `None`, `false` from direct-field `presentWhen`, or `None` from a custom `read` stops every child Stream as part of whole-child absence. Put Stream-only activation policy in `subscriptions.when`; a keyed `makeBinding` configuration gives each key its own Stream scopes.

### Managed Resources (if stateful runtime handles)

- Define a concrete resource such as a camera with `FeatureDefinition.makeManagedResources(entry => ({ camera: entry('ManageCamera', CameraRequirements, { ...config, handler: function* () { return { acquire, release } } }) }))`. The stable handler name precedes the requirements Schema. `config` carries the `resource` tag, `modelToMaybeRequirements`, and the `onAcquired`/`onReleased`/`onAcquireError` Messages. Both lifecycle functions are required whenever `handler` is supplied. Compose a closed, fully attached registry with `managedResources.layer` in the owning module's `EffectsLayer`. Use individual entry providers for selective or mixed host-owned composition. Reserve the registry key `layer`; empty owned registries provide `Layer.empty`
- `modelToMaybeRequirements` returns `Option.some(params)` to acquire (or re-acquire when params change) and `Option.none()` to release. Resources auto-acquire/release on Model state, like Subscriptions
- For a resource with no params, use `Schema.Option(Schema.Null)` and return `Option.some(null)`
- Read the service union with `ManagedResource.ServicesOf<typeof managedResources>`
- Child Bindings lift ManagedResources through their `read` and Message policies. Use a keyed `makeBinding` configuration for dynamic collections.
- Child Bindings collect and lift ManagedResources automatically. Optional absence releases that occurrence's handles; a keyed `makeBinding` configuration gives each key independent handles.
- Handler Layers go in the owning feature's `EffectsLayer`, which `FeatureComposition.prepareBlock` attaches to the unfinished assembly and `Block.assemble` carries onto the completed Block. App-lifetime service providers go in the root `ApplicationLayer` and enter through `program.provide(ApplicationLayer)`; there is no `resources` config field or `persistent` ManagedResource.
- Keep app service and handler scope separate from ManagedResource handle scope. Releasing or reacquiring a Model-driven handle does not rebuild the handler Layer or its providers

## Phase 4.5: Self-check before verification

Before running `tsc` or opening the browser, do a quick mechanical pass over the generated files. The reviewer in Phase 6 catches these, but catching them at write-time is cheaper than catching them after a full review round. Skip this and you inflate round-1 review noise with preventable items.

**Run the lint script first, then the "Mechanical scans" block in `checklist.md`** against `src/`. The scaffold wires `@foldkit/oxlint-plugin`, whose rules are the structural check: keyed rows, route printing, empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`, child ownership, and Command naming. Treat every `foldkit(...)` diagnostic as a blocker; that is how they are labelled in the output. The greps then cover ground no rule touches (API drift, `@foldkit/ui` adoption, Effect idiom, unpaired labels, `maybe*` on non-Option, `span([])` placeholders, redundant `Effect.ignore`, focus-outline resets) plus the deliberate edges of rules that are narrow: empty-object calls through a namespace, `_blank` inside a spread attribute array, mapped rows keyed on something other than `.id`, a spread in the `modifyFields` updates object itself, and `as` casts on constructor returns, which only the scaffold's oxlint config rejects. A green lint does not clear those. Each hit is either a fix or a `// NOTE:` justification.

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

Use whichever package manager the project was scaffolded with: `npm run`, `pnpm run`, `yarn`, or `bun run`. If a script is missing, run the project-local binary through that manager's exec (`pnpm exec oxfmt`, `npm exec --no-install oxfmt`, `yarn exec oxfmt`, `bun x --no-install oxfmt`). Avoid bare `npx`, which fetches and runs a package from the registry when the binary isn't installed locally.

Run **format first** because it rewrites files; running it last would leave tsc/test passing against unformatted code that a pre-commit hook would then reformat, creating a diff the user has to clean up. Running it first means lint/typecheck/test verify the exact code that will be committed.

Each catches different classes of issue:

- **Format** rewrites spacing, indentation, trailing commas, and line wrapping to project style. Not a "check"; a normalizer. Generated code rarely matches Oxfmt's exact formatting by accident; without this step, every `git commit` produces a cascade of formatting-only diffs.
- **Lint** catches unused imports, unused variables, and style-rule violations. Easy to miss because generated code often imports a symbol "for completeness" that turns out not to be referenced (e.g. importing `NotValidated`, `Invalid` from fieldValidation when they're only used as string literals inside `Match.tag` keys). `tsc` doesn't flag these.
- **Typecheck** catches API misuse, wrong parameter shapes, missing required props, and structural type errors. Doesn't catch unused imports.
- **Tests** catch behavioral regressions. Don't catch either of the above.

If the project doesn't have a format/lint script, check `package.json` and run the binaries through your package manager's exec (`pnpm exec oxfmt` / `pnpm exec oxlint src`, or the npm / yarn / bun equivalent) directly. Don't skip either because "there's no script". The scaffolded `create-foldkit-app` project always ships both configured.

Fix ALL output from all four before declaring Phase 5 done. "Typecheck clean and tests pass" is insufficient. Unformatted code with unused imports is not at the bar.

### Type errors first

Then generate tests using `foldkit/test`. There are two test styles. Name each test file for its style, beside the code under test: `story.test.ts` for Story tests (the state machine, driving `update`) and `scene.test.ts` for Scene tests (the rendered view). The name describes how the test works, not a source file, so it holds whether `update` and `view` live in `application.ts` or their own files. Keep both patterns inside the TypeScript project's `include` coverage; the scaffold's `src/**/*` includes them. When a folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`. Scene runs at any level: a Composition-owned view is still a plain `(model, h) => Html`, so a page's view drops into `scene` unmodified, and a Block declaring `ViewInputs` takes a second argument the test supplies through `withViewInputs(view, defaults)`, whose returned factory takes per-test overrides for everything except `toView`. A page-level Scene asserts the OutMessage a Block emits with `expectOutMessage` / `expectNoOutMessage`, and drives Messages from the non-view lifecycle causes with cause-named steps. To use `Subscription.emit`, pass the owning Composition and registered `subscriptions` in the `scene` config and declare each emittable Message Schema in the entry's `messages`. Pass the exact entry and its raw Message; Scene derives generated delivery from the registered source and occurrence. Registrations that need selection must use distinct entry objects for each path. Silent entries with `messages: []` accept no emissions. Use `Subscription.emit` for a Subscription-origin fact; use a DOM interaction when testing the same Message from a DOM-origin path. `ManagedResource.acquire` / `release` / `failAcquire` are gated on the entry's `modelToMaybeRequirements`, so drive the Model transition first. `CustomElement.emit` is typed by the spec's event Schemas. An interaction whose handler returns `Option.none()` lets the event fall through, and Scene requires that be stated: follow it with `expectIgnored()`, or Scene fails at the next interaction or the end of the scene. Use `expectHandled()` where the event should have been consumed, which is the assertion behind a key being consumed so the browser default is prevented. Put a `scene.test.ts` in the page folder for behavior that page owns, and keep a root-level `scene.test.ts` for flows that cross pages, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes.

When adding a whole-application execution test, keep the real handler Layers and replace their external service providers before building the application Layer. Choose the lowest boundary whose code the test needs to exercise: when `ApiLayer` owns decoding, retries, or business behavior, keep it and replace its HTTP or RPC transport. Replacing `ApiLayer` with `ApiTestLayer` narrows coverage to code above that service. This approach exercises real Command result mapping, Subscription Stream transformation, Mount element lifecycle, and ManagedResource acquire and release behavior. Replace an entire handler only when the test is intentionally orchestrating a result path; do not claim that path tests the replaced handler. Handler stubs are the narrower tool for orchestration. Use Effect Layer substitution directly; do not invent another testing DSL.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`: `import { Command, given, message, model, story } from 'foldkit/story'`. A test file needs only one of the two modules, so this keeps call sites short. In the rare case a single file tests both a story and a scene, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

**Story tests** (`story.test.ts`) test the update function directly. You send Messages and assert on the Model and Commands. Study these exemplars:

Story permits another Message while Commands are pending. Use `messageWith(model => Message.Variant(...))` for a value read from the current Model when the step runs. Use `Subscription.from(FeatureBlock.subscriptions).emit(entry, message)` to validate a decoded Subscription Message and apply its registered parent mapping. These steps do not start Streams or test Runtime activity and stale-generation admission.

Scene normally requires pending Commands to settle before later Messages. For a deliberate concurrent interaction, `Scene.Command.keepPending(Definition | instance)` selects one exact invocation for that boundary exemption. Assertions and every resolver still see it, and final completeness requires resolution. A bound instance selects a child occurrence and args. Prefer this explicit operation over custom simulation transforms.

- `${CLAUDE_SKILL_DIR}/../../examples/weather/src/story.test.ts`: simple Command resolution (happy path + error path)
- `${CLAUDE_SKILL_DIR}/../../examples/auth/src/page/loggedOut/page/login.story.test.ts`: Block with OutMessage assertions, field validation
- `${CLAUDE_SKILL_DIR}/../../packages/website/src/search/story.test.ts`: multi-step interactions (arrow key cycling, stale result handling)

Write `story` pipelines covering:

- **Happy path**: the primary user flow from start to finish
- **Error path**: every fallible Command resolved with its `Failed*` Message
- **Multi-step interaction**: at least one test that chains multiple Messages and Command resolutions
- **Edge cases**: empty states, boundary conditions, ignored inputs (e.g. stale results, duplicate submissions)

Match pending Commands with their original Definitions, not a displayed `command.name` string or `Definition.name`. Source identity survives Binding qualification. Pass an instance for exact args; a bound instance also selects its composition path. Resolve a child Command with its raw child result Message; Story replays the generated delivery chain.

`Story.message` can deliver concurrent facts while Commands remain pending. Keep the real pending Command when testing a delayed result alongside another update; do not replace that interaction with a hand-constructed pending Model. Resolve each Command explicitly before the Story ends. Dispatching another Message does not run stored resolvers. Scene retains its separate pending-Command and Mount checks.

For a parent-owned headless delivery or OutMessage policy test, use `toParentMessage(binding, childMessage)` from `foldkit/test`; a keyed Binding takes its decoded key before the Message. Use the actual Binding and decoded contracts, without fabricated envelopes or irrelevant `embedView` inputs. It wraps one pure replay boundary with generation `0`, not a live occurrence. Production parents continue to use Binding operations, and Command/Subscription results retain their existing source replay paths.

Check a completed `@foldkit/ui` Block's `test` namespace before writing resolvers for its Commands and Mounts. Pair those original Definitions with result Messages from the completed Block. Use a completed Block's published drain helper when one is available for a multi-Command lifecycle. For example, use `ToastBlock.test.drainEntry({ binding: ToastBinding, entryId })` for a newly shown toast that auto-dismisses.

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
   (src/application.ts, src/update.ts, ...).
2. ${CLAUDE_SKILL_DIR}/architecture.md
3. ${CLAUDE_SKILL_DIR}/conventions.md
4. ${CLAUDE_SKILL_DIR}/checklist.md
5. ${CLAUDE_SKILL_DIR}/blindSpots.md
6. At least one exemplar file matching the generated app's complexity,
   from the foldkit repo (vendored at repos/foldkit/ when the project
   has the subtree):
   - Tier 1-2: packages/foldkit/src/runtime/runtime.ts (quality calibration)
   - Tier 3-4: examples/weather/src/command.ts AND examples/weather/src/update.ts, OR examples/form/src/update.ts
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
6. **When to restructure**: mention signals that the program has outgrown its current file organization (e.g., "if update exceeds ~20 cases, consider extracting a Block")
