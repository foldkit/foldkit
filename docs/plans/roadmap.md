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

## Phase 2: Documentation

Items that expand the website docs. Can be done in parallel with each other.

### 2a. Arrays of submodels with ID-based message routing

**Scope:** `packages/website/` docs page + possibly a new example

Document the pattern for `S.Array(Item.Model)` where messages carry an item ID and the update function routes to the correct element. Show:

- Schema definition with item ID in messages
- Update function using `Array.map` or `Array.findFirst` to target the right item
- View rendering with `Array.map` and keying

Consider whether this warrants a small example app (e.g. a todo list with per-item state).

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

### 3e. Undo/redo example app

**Scope:** `examples/`

A markdown previewer or similar app demonstrating an undo/redo stack. Showcases the Elm Architecture's natural fit for undo (model snapshots as history). Independent of other work.
