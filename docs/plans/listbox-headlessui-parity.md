# Listbox: Headless UI Parity Plan

Tracking remaining work to reach feature parity with Headless UI's Listbox component.

Reference: [Headless UI Listbox (React v2)](https://headlessui.com/react/listbox)

## Completed

- [x] Single select with persistent value (`maybeSelectedItem: Option<string>`)
- [x] ARIA: `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`, `aria-selected`
- [x] ARIA: `aria-activedescendant`, `aria-expanded`, `aria-controls`, `aria-labelledby`
- [x] Data attributes: `data-selected`, `data-active`, `data-disabled`, `data-open`
- [x] Keyboard navigation (ArrowUp/Down, Home/End, PageUp/Down, Escape, Tab)
- [x] Enter/Space to select, close on select
- [x] Open to selected item on keyboard open
- [x] Typeahead search with debounce
- [x] Disabled items (skipped in keyboard nav, unselectable)
- [x] Anchor positioning (Floating UI — placement, flip, shift, offset, `--button-width`)
- [x] Portal support
- [x] CSS transition system (`data-enter`, `data-leave`, `data-closed`, `data-transition`)
- [x] Modal mode (scroll lock + inert)
- [x] Form integration (hidden `<input>` with `name`)
- [x] Backdrop click to close
- [x] Scroll into view on keyboard nav
- [x] Item grouping with headings and separators (foldkit-only — Headless UI lacks this)
- [x] Mouse vs touch button toggle (`maybeLastButtonPointerType`)
- [x] ArrowDown/Up from no-active-item goes to first/last enabled
- [x] Horizontal orientation (`orientation: 'Horizontal'` in model, ArrowLeft/Right nav, `aria-orientation`)
- [x] Whole-listbox disabled (`isDisabled` in ViewConfig, wrapper + button `data-disabled`, `aria-disabled`)
- [x] Invalid state (`isInvalid` in ViewConfig, wrapper + button `data-invalid`)
- [x] `form` prop (hidden input `form` attribute for remote form association)
- [x] Multiple selection (`isMultiple` in model, toggle behavior, `aria-multiselectable`, multiple hidden inputs)
- [x] Typed items (`itemToValue` mapping, unconstrained `Item` generic, string-value approach)

## Remaining

### 1. Button state data attributes

**Scope:** `packages/foldkit/src/ui/listbox/index.ts`
**Priority:** Low

Headless UI exposes `data-focus`, `data-hover`, `data-active` on the button. foldkit consumers can use native CSS `:hover`/`:focus`/`:active` instead, so this is low priority. But for consistency with the data-attribute-driven styling pattern:

**Changes:**

- Track `isFocused` and `isHovered` for button (would need new messages or view-level tracking)
- Render `data-focus`, `data-hover` on button element
- Consider if this is worth the model complexity vs. using CSS pseudo-classes

### 2. `autoFocus` on button

**Scope:** `packages/foldkit/src/ui/listbox/index.ts`
**Priority:** Low

**Changes:**

- Add `autoFocus?: boolean` to `InitConfig`
- When true, `init` returns a focus command targeting the button
- Render `data-autofocus` attribute

## Not applicable to foldkit

These Headless UI features are React-specific patterns that don't map to foldkit's architecture:

- **`as` prop** — foldkit uses `itemToConfig` callback pattern and fixed element types
- **Render props (`open`, `value`, `selected`, `focus`)** — foldkit exposes state via `itemToConfig` context and the model directly
- **`static` / `unmount` props** — foldkit's virtual DOM handles mount/unmount; transition system already keeps items mounted during leave
- **Controlled vs uncontrolled (`value`/`defaultValue`)** — foldkit's Elm Architecture is always "controlled" — model is the single source of truth, updated via messages
- **`ListboxSelectedOption`** — React-specific render delegation pattern; foldkit consumers read `model.selectedItems` directly in their button content
- **Dynamic item registration** — foldkit takes a declarative `items` array; no register/unregister lifecycle
- **`useTreeWalker` role assignment** — foldkit explicitly sets all roles in virtual DOM

## Suggested implementation order

1. **Button state data attributes** — low priority, consider deferring
2. **`autoFocus`** — low priority, trivial when needed
