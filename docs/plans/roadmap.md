# Roadmap

Open items from TODO.md, organized into phases by dependency and priority. Menu work is tracked separately in `plan/menu-headlessui-parity.md`.

## Phase 1: Foundations

Small, self-contained items that unblock later work or close out investigations.

### 1a. `OnKeyDown` modifier keys

**Scope:** `packages/foldkit/src/html/index.ts`

Currently `OnKeyDown` and `OnKeyDownPreventDefault` only pass `event.key` as a plain string. Modifier state (`ctrlKey`, `shiftKey`, `altKey`, `metaKey`) is not exposed, making it impossible to handle shortcuts like `Ctrl+K` at the message level.

**Change:** Introduce a `KeyboardEventInfo` struct (or similar) that carries `key` plus the four modifier booleans. Update `OnKeyDown`, `OnKeyDownPreventDefault`, `OnKeyUp`, and `OnKeyUpPreventDefault` to pass this struct instead of a bare string. This is a breaking change to the callback signature.

**Why first:** Unblocks doc site search (Cmd+K trigger), and is prerequisite for richer keyboard interactions in future UI components (focus traps, complex shortcuts).

### 1b. Data attributes convention

**Scope:** `packages/foldkit/src/ui/tabs/index.ts` (retrofit), then apply to Menu and all future components

Tabs already emits `data-selected` and `data-disabled`. The TODO asks for a formalized convention that every foldkit-ui component emits `data-*` attributes reflecting interactive state (`data-selected`, `data-disabled`, `data-active`, `data-checked`, `data-open`, `data-focus`).

**Change:**

1. Audit Tabs for any missing state attributes (e.g. `data-focus` if applicable)
2. Audit Menu for missing data attributes — add `data-open` on button, `data-active` on the active item, `data-disabled` on disabled items
3. Document the convention (which attributes, naming rules, when to emit empty string vs omit) so all future components follow it

**Why first:** Establishes a pattern that every subsequent UI component follows. Cheap to do now on two existing components.

### 1c. Investigate `html` function generic

**Scope:** `packages/foldkit/src/html/index.ts` line 1978

The TODO asks "Why does the html function not require a generic arg?" — `html<Message>()` does require one at the call site. The question may be about whether TypeScript can infer it (e.g. from the update function's return type), removing the need for the explicit `<Message>` generic.

**Change:** Investigate whether contextual typing or a builder pattern could eliminate the explicit generic. If not feasible without significant API changes, close the item with an explanation.

### 1d. `Route.oneOf` variadic or documented limit

**Scope:** `packages/foldkit/src/route/parser.ts` lines 240-362

Currently 10 typed overloads. Options:

- Make it truly variadic (loses per-position type safety unless using mapped tuple types)
- Document that users should nest `oneOf(oneOf(a,b,c), oneOf(d,e,f), ...)` for more than 10
- Increase to 15-20 overloads as a pragmatic middle ground

**Change:** Evaluate which approach best serves real apps. The website router currently uses a single `oneOf` — check if any real app would exceed 10 routes at one level.

## Phase 2: Documentation

Items that expand the website docs. Can be done in parallel with each other.

### 2a. Arrays of submodels with ID-based message routing

**Scope:** `packages/website/` docs page + possibly a new example

Document the pattern for `S.Array(Item.Model)` where messages carry an item ID and the update function routes to the correct element. Show:

- Schema definition with item ID in messages
- Update function using `Array.map` or `Array.findFirst` to target the right item
- View rendering with `Array.map` and keying

Consider whether this warrants a small example app (e.g. a todo list with per-item state).

### 2b. Document FieldValidation module

**Scope:** `packages/website/` new docs page

The module lives at `packages/foldkit/src/fieldValidation/` and exports `makeField`, `validateField`, and a library of validators (`required`, `minLength`, `email`, etc.). The API reference page already pulls from TypeDoc, but a narrative guide showing the workflow (define field schema, wire validations, handle `NotValidated | Validating | Valid | Invalid` states in update and view) would be valuable.

### 2c. Changelog page

**Scope:** `packages/website/`

Add a changelog page to the website. Options:

- Pull from `CHANGELOG.md` files in each package (if they exist via changesets)
- Curate manually with version highlights
- Auto-generate from git tags/changesets at build time (similar to how API reference uses a Vite virtual module)

## Phase 3: Features

Larger items that build on the foundations.

### 3a. Doc site search (Cmd+K)

**Scope:** `packages/website/`

No search infrastructure exists today. The site is fully client-side with static content baked in at build time.

**Approach options:**

- **Client-side index:** Build a search index at build time (from doc page content), bundle it, and search in-browser. Libraries like Fuse.js, MiniSearch, or FlexSearch. Zero infrastructure cost, works offline.
- **Pagefind:** Rust-based static search that generates an index from the built HTML. Lightweight, good relevance, used by many static doc sites.

**Dependencies:** Modifier key support (Phase 1a) for the Cmd+K trigger. The search UI itself would be a foldkit component (model/message/update/view) — could use a Dialog or Popover component if available, or a simpler overlay.

**Subparts:**

1. Build-time index generation
2. Search model/message/update (query state, results, selected result)
3. Search view (modal overlay with input, result list, keyboard navigation)
4. Cmd+K global shortcut to open

### 3b. Remaining foldkit-ui components

**Scope:** `packages/foldkit/src/ui/`

Listbox, Combobox, Popover, Switch, Radio Group, Checkbox, Input, Select, Textarea, Fieldset. Each follows the same pattern as Tabs and Menu: Model, Message, update, view, with data attributes per the Phase 1b convention.

Priority order (by general usefulness and dependency):

1. **Switch** — simplest, good for establishing the component template post-convention
2. **Popover** — shares portal/positioning infrastructure with Menu (from menu plan item #3)
3. **Combobox** — Listbox + text input, builds on Listbox
4. **Radio Group, Checkbox** — form primitives
5. **Dialog** — may share portal infrastructure with Popover
6. **Input, Select, Textarea, Fieldset** — form wrappers, lower priority

Listbox is complete (single-select and multi-select, tracked in `plan/listbox-headlessui-parity.md`).

**Dependencies:** Data attributes convention (Phase 1b). Portal support from Menu plan item #3 unblocks Popover, Combobox, Dialog.

### 3c. General portal support

**Scope:** `packages/foldkit/src/`

This overlaps with Menu plan item #3 (anchor positioning + portal rendering). The portal mechanism built for Menu should be extracted into a general-purpose module that Popover, Listbox, Combobox, and Dialog can reuse.

**Dependencies:** Menu portal implementation (tracked in `plan/menu-headlessui-parity.md` item #3).

### 3d. `examples/foldkit-ui` showcase app

**Scope:** `examples/foldkit-ui/`

A standalone app with a page per UI component showing real integration patterns. Blocked on having enough components built (Phase 3b).

### 3e. Undo/redo example app

**Scope:** `examples/`

A markdown previewer or similar app demonstrating an undo/redo stack. Showcases the Elm Architecture's natural fit for undo (model snapshots as history). Independent of other work.
