# Menu

## Overview

A dropdown menu for actions, like a macOS context menu. Menu is fire-and-forget: each activation is an action, not a choice that persists (use Listbox for selection, where the parent owns the selected value). It supports nested submenus, typeahead search, drag-to-select, keyboard navigation, grouped items, and anchor positioning.

Programmatic helpers are child entry points. Fold the factory's `open` and `close` helpers with `Update.foldChildStep`. Fold `selectItem` with `Update.foldChild` because it takes the selected item and index as input.

What `Menu.create<Item>()` returns is typed [`Menu.Bundle<Item>`](/ui/selection-submodels#bundle-type), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how Menu is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/menu.ts).
:::

## Examples

### Basic

Pair `view` and `update` behind `Menu.create<Item>()` at module scope. The factory threads your item union through both, so `Selected({ value, index })` carries the picked value directly. Menu closes automatically after selection.

::Demo{name="basic"}

::Snippet{name="uiMenuBasic" label="Menu"}

### Animated

Pass `isAnimated: true` at init for animation coordination.

::Demo{name="animated"}

::Snippet{name="uiMenuAnimated" label="Animated menu"}

### Submenus

Put `Menu.submenu({ id, label, items })` among the leaf actions to create a child menu. Give each sibling submenu a distinct `id` and keep it stable when building items from changing data; the ID identifies that branch in selection paths. Child entries may contain further submenus. `Menu.create<Action>()` keeps `Selected.value` typed as a leaf action. The demo uses `isModal: true` to keep the page inert while the tree is open.

::Demo{name="submenu"}

::Snippet{name="uiMenuSubmenus" label="Nested action submenus"}

The Menu owns focus, dismissal, backdrop, and modal behavior for the whole tree. Switching between sibling submenus replaces the child panel in one render, so the menu does not briefly show an empty level. `submenuToConfig` controls the appearance of submenu triggers. The demo's Export trigger uses `isDisabled`, so it cannot open. Selecting a leaf closes the full tree and emits its value. Selections emitted by the view also include `path` and `indexPath`; these fields remain optional on the public constructor so existing flat callers can continue to construct `Selected({ value, index })`.

## Styling

Menu is headless. The `itemToConfig` callback controls leaf action markup, and `submenuToConfig` controls submenu triggers. Group leaf actions with `itemGroupKey` and `groupToHeading`; each submenu forms its own group without calling either callback.

The root panel is positioned relative to the button, and each child panel is positioned relative to its submenu trigger. Child panels use a negative 8-pixel gap to overlap the parent edge by default, and Floating UI flips them when they would overflow the viewport. Set `submenuAnchor.gap` to change the overlap. Panels are portaled to the containing document or ShadowRoot, so ancestor clipping does not hide them. For full keyboard and modal behavior, render Menu in the document tree; its existing focus and isolation Commands do not resolve controls inside a ShadowRoot. Give panels a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Inside a `<dialog>`, panels are portaled into that dialog. Pass `anchor: { portal: false }` for the root or `submenuAnchor: { portal: false }` for children to keep those panels in the wrapper.

When `isAnimated` is true, the root panel's enter/leave animations flow through the [Animation](/ui/animation) module. Child panels open and close immediately. Style the root panel with CSS transitions or CSS keyframe animations. Animation advances once every animation on the root element has settled.

| Attribute        | Condition                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-open`      | Present on the root button when the menu is open and on submenu triggers whose child panel is open.                                                             |
| `data-active`    | Present on the highlighted menu item.                                                                                                                           |
| `data-disabled`  | Present on disabled menu items.                                                                                                                                 |
| `data-closed`    | Present during close animation.                                                                                                                                 |
| `data-placement` | Present on the items panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

Menu uses `aria-activedescendant`. Focus stays on the root items container while arrow keys update the highlighted item in the active level. Typeahead search is separate for each level and accumulates characters for 350ms. Modified shortcuts do not enter typeahead.

Keyboard opening activates the first or last enabled item. Navigation and typeahead can highlight disabled items so assistive technology can announce their unavailable state. Disabled items cannot be selected, and disabled submenu triggers cannot open a child panel.

| Key                | Description                                                                         |
| ------------------ | ----------------------------------------------------------------------------------- |
| `Enter / Space`    | Opens the menu from the button, opens an active submenu, or selects an active leaf. |
| `Arrow Down`       | Opens with first enabled item active (from button) or moves to next item.           |
| `Arrow Up`         | Opens with last enabled item active (from button) or moves to previous item.        |
| `Home / End`       | Moves to the first / last item.                                                     |
| `Arrow Right`      | Opens the active submenu and activates its first enabled item.                      |
| `Arrow Left`       | Closes a child menu and reactivates its parent trigger.                             |
| `Escape`           | Closes one submenu level, or closes the root and focuses the button.                |
| `Tab / Shift+Tab`  | Leaves the menu tree without trapping focus.                                        |
| `Type a character` | Typeahead search: jumps to the matching item.                                       |

Pointer hover opens a submenu after a short delay. While a child is open, Menu briefly defers activation of other parent items so the pointer can travel diagonally into that child without switching panels. Click or touch on a submenu trigger opens the child immediately; activating the open trigger again closes that child and leaves the root menu open.

## Accessibility

The button receives `aria-haspopup="menu"` and `aria-expanded`. The root items container receives `role="menu"` with `aria-activedescendant`. Each item receives `role="menuitem"`. A submenu trigger exposes `aria-haspopup="menu"` and `aria-controls`; `aria-owns` connects it to its portaled child panel.

Closed submenu triggers expose `aria-expanded="false"`. While a child has an active descendant, its open trigger omits `aria-expanded` so VoiceOver can announce the child without a competing expanded state announcement. An open child without a valid active item exposes `aria-expanded="true"`. Use `data-open` or the `isSubmenuOpen` context for styling submenu triggers.

Give the trigger an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `Menu.buttonId(id)` rather than hardcoding the `-button` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the menu. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Menu.init()`.

| Name         | Type      | Default | Description                                                 |
| ------------ | --------- | ------- | ----------------------------------------------------------- |
| `id`         | `string`  | —       | Unique ID for the menu instance.                            |
| `isAnimated` | `boolean` | `false` | Enables animation coordination.                             |
| `isModal`    | `boolean` | `false` | Locks page scroll and marks other elements inert when open. |

### ViewConfig {#view-config}

Configuration object passed to `Menu.view()`.

| Name                    | Type                                                     | Default | Description                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`                 | `Menu.Model`                                             | —       | The menu state from your parent Model.                                                                                                                                                                                                                                                                                               |
| `toParentMessage`       | `(childMessage: Menu.Message) => ParentMessage`          | —       | Wraps Menu Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                                                             |
| `items`                 | `ReadonlyArray<Menu.Entry<Item>>`                        | —       | Leaf actions and nested submenu entries. A flat `Item[]` is also accepted.                                                                                                                                                                                                                                                           |
| `itemToConfig`          | `(item, context) => ItemConfig`                          | —       | Maps each leaf action to its className and content. The context provides active, disabled, and path information.                                                                                                                                                                                                                     |
| `submenuToConfig`       | `((submenu, context) => ItemConfig) \| undefined`        | —       | Maps submenu triggers to className and content. Without it, the trigger displays the submenu label.                                                                                                                                                                                                                                  |
| `buttonContent`         | `Html`                                                   | —       | Content rendered inside the trigger button.                                                                                                                                                                                                                                                                                          |
| `isItemDisabled`        | `((item, index, context) => boolean) \| undefined`       | —       | Disables leaf actions. Use `isDisabled` on a submenu entry to disable its trigger.                                                                                                                                                                                                                                                   |
| `itemToSearchText`      | `((item, index, context) => string) \| undefined`        | —       | Overrides the text matched by typeahead for leaves. Leaf values and submenu labels are the defaults.                                                                                                                                                                                                                                 |
| `isButtonDisabled`      | `boolean \| undefined`                                   | —       | Disables the trigger button entirely. The menu cannot be opened while true.                                                                                                                                                                                                                                                          |
| `itemGroupKey`          | `((item, index) => string) \| undefined`                 | —       | Groups contiguous items by key.                                                                                                                                                                                                                                                                                                      |
| `groupToHeading`        | `((groupKey) => GroupHeading \| undefined) \| undefined` | —       | Renders a heading for each group.                                                                                                                                                                                                                                                                                                    |
| `anchor`                | `AnchorConfig \| undefined`                              | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the button; when omitted, the panel uses bottom-start placement. Portaled to the document body, or into an enclosing dialog, by default; pass portal: false to keep the panel inside the wrapper. |
| `submenuAnchor`         | `AnchorConfig \| undefined`                              | —       | Positioning for each child panel, relative to its parent item. Defaults to right-start with `gap: -8` for a slight overlap and viewport flipping. Set `gap` to change the overlap.                                                                                                                                                   |
| `buttonClassName`       | `string \| undefined`                                    | —       | CSS class for the trigger button.                                                                                                                                                                                                                                                                                                    |
| `buttonAttributes`      | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the trigger button alongside its built-in click/keyboard handlers and aria-\* attributes.                                                                                                                                                                                                               |
| `itemsClassName`        | `string \| undefined`                                    | —       | CSS class for the items container (the panel root).                                                                                                                                                                                                                                                                                  |
| `itemsAttributes`       | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the items container.                                                                                                                                                                                                                                                                                    |
| `itemsScrollClassName`  | `string \| undefined`                                    | —       | CSS class for the inner scrollable wrapper around the item list. Useful for setting max-height/overflow without restyling the panel root.                                                                                                                                                                                            |
| `itemsScrollAttributes` | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the inner scrollable wrapper.                                                                                                                                                                                                                                                                           |
| `backdropClassName`     | `string \| undefined`                                    | —       | CSS class for the backdrop.                                                                                                                                                                                                                                                                                                          |
| `backdropAttributes`    | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the backdrop element.                                                                                                                                                                                                                                                                                   |
| `groupClassName`        | `string \| undefined`                                    | —       | CSS class applied to each group wrapper.                                                                                                                                                                                                                                                                                             |
| `groupAttributes`       | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto each group wrapper.                                                                                                                                                                                                                                                                                     |
| `separatorClassName`    | `string \| undefined`                                    | —       | CSS class applied to the separator rendered between adjacent groups.                                                                                                                                                                                                                                                                 |
| `separatorAttributes`   | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto each group separator.                                                                                                                                                                                                                                                                                   |
| `className`             | `string \| undefined`                                    | —       | CSS class applied to the outer Menu root element.                                                                                                                                                                                                                                                                                    |
| `attributes`            | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the outer Menu root element.                                                                                                                                                                                                                                                                            |
| `ariaLabel`             | `string`                                                 | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                                                         |
| `ariaLabelledBy`        | `string`                                                 | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                                                             |

### Submenu entries

`Menu.Entry<Item>` is a leaf `Item` or a `Menu.Submenu<Item>`. Create a submenu with `Menu.submenu` and pass it in `items` at any depth.

| Name         | Type                              | Description                                                                |
| ------------ | --------------------------------- | -------------------------------------------------------------------------- |
| `id`         | `string`                          | Stable branch identity, unique among siblings, used in the selected path.  |
| `label`      | `string`                          | Accessible name and default typeahead text for the trigger.                |
| `items`      | `ReadonlyArray<Menu.Entry<Item>>` | Child actions and submenus.                                                |
| `isDisabled` | `boolean \| undefined`            | Prevents the submenu trigger from opening or receiving pointer activation. |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name       | Type                                                                                              | Default | Description                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Selected` | `{ value: Item; index: number; path?: ReadonlyArray<string>; indexPath?: ReadonlyArray<number> }` | —       | Emitted only for a leaf action. `value` is typed by `Menu.create<Item>()`, and `index` is the leaf's position in its level. Selections from the view include `path` (submenu IDs followed by the leaf value) and `indexPath` (the corresponding sibling indexes). Menu closes the full tree before emitting. |
