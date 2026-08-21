# Menu

## Overview

A dropdown menu for actions, like a macOS context menu. Menu is fire-and-forget: each activation is an action, not a choice that persists (use Listbox for selection, where the parent owns the selected value). It supports typeahead search, drag-to-select, keyboard navigation, grouped items, and anchor positioning.

For programmatic control in update functions, use the factory’s `open(model)`, `close(model)`, and `selectItem(model, item, index)` methods. Each returns the same `{ model, commands?, outMessage? }` record as `update`.

What `Menu.create<Item>()` returns is typed [`Menu.Bundle<Item>`](/ui/selection-submodels#bundle-type), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how Menu is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/menu.ts).
:::

## Examples

### Basic

Pair `view` and `update` behind `Menu.create<Item>()` at module scope. The factory threads your item union through both, so `Selected({ value, index })` carries the picked value directly. Menu closes automatically after selection.

::Demo{name="basic"}

::Snippet{name="uiMenuBasic" label="menu example"}

### Animated

Pass `isAnimated: true` at init for animation coordination.

::Demo{name="animated"}

::Snippet{name="uiMenuAnimated" label="animated menu example"}

## Styling

Menu is headless. The `itemToConfig` callback controls all item markup. Group items with `itemGroupKey` and `groupToHeading`.

The items panel is portaled to the document body and positioned relative to the trigger button with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling overlay wrapper cannot hide an open menu. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Pass `anchor: { portal: false }` to keep the panel inside the wrapper instead.

When `isAnimated` is true, enter/leave animations flow through the [Animation](/ui/animation) module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.

| Attribute        | Condition                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-open`      | Present on the button when the menu is open.                                                                                                                    |
| `data-active`    | Present on the highlighted menu item.                                                                                                                           |
| `data-disabled`  | Present on disabled menu items.                                                                                                                                 |
| `data-closed`    | Present during close animation.                                                                                                                                 |
| `data-placement` | Present on the items panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

Menu uses `aria-activedescendant`. Focus stays on the items container while arrow keys update the highlighted item. Typeahead search accumulates characters for 350ms.

| Key                | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `Enter / Space`    | Opens the menu (from button) or selects the active item.             |
| `Arrow Down`       | Opens with first item active (from button) or moves to next item.    |
| `Arrow Up`         | Opens with last item active (from button) or moves to previous item. |
| `Home / End`       | Moves to the first / last item.                                      |
| `Escape`           | Closes the menu and returns focus to the button.                     |
| `Type a character` | Typeahead search: jumps to the matching item.                        |

## Accessibility

The button receives `aria-haspopup="menu"` and `aria-expanded`. The items container receives `role="menu"` with `aria-activedescendant`. Each item receives `role="menuitem"`.

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

| Name                    | Type                                                     | Default | Description                                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`                 | `Menu.Model`                                             | —       | The menu state from your parent Model.                                                                                                                                                                                                                                                                 |
| `toParentMessage`       | `(childMessage: Menu.Message) => ParentMessage`          | —       | Wraps Menu Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                               |
| `items`                 | `ReadonlyArray<Item>`                                    | —       | The list of menu items.                                                                                                                                                                                                                                                                                |
| `itemToConfig`          | `(item, context) => ItemConfig`                          | —       | Maps each item to its className and content. The context provides isActive and isDisabled.                                                                                                                                                                                                             |
| `buttonContent`         | `Html`                                                   | —       | Content rendered inside the trigger button.                                                                                                                                                                                                                                                            |
| `isItemDisabled`        | `((item, index) => boolean) \| undefined`                | —       | Disables individual menu items.                                                                                                                                                                                                                                                                        |
| `itemToSearchText`      | `((item, index) => string) \| undefined`                 | —       | Optional override for the string typeahead matches against. Defaults to the item itself; override when items carry searchable text distinct from their display content.                                                                                                                                |
| `isButtonDisabled`      | `boolean \| undefined`                                   | —       | Disables the trigger button entirely. The menu cannot be opened while true.                                                                                                                                                                                                                            |
| `itemGroupKey`          | `((item, index) => string) \| undefined`                 | —       | Groups contiguous items by key.                                                                                                                                                                                                                                                                        |
| `groupToHeading`        | `((groupKey) => GroupHeading \| undefined) \| undefined` | —       | Renders a heading for each group.                                                                                                                                                                                                                                                                      |
| `anchor`                | `AnchorConfig \| undefined`                              | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the button; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper. |
| `buttonClassName`       | `string \| undefined`                                    | —       | CSS class for the trigger button.                                                                                                                                                                                                                                                                      |
| `buttonAttributes`      | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the trigger button alongside its built-in click/keyboard handlers and aria-\* attributes.                                                                                                                                                                                 |
| `itemsClassName`        | `string \| undefined`                                    | —       | CSS class for the items container (the panel root).                                                                                                                                                                                                                                                    |
| `itemsAttributes`       | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the items container.                                                                                                                                                                                                                                                      |
| `itemsScrollClassName`  | `string \| undefined`                                    | —       | CSS class for the inner scrollable wrapper around the item list. Useful for setting max-height/overflow without restyling the panel root.                                                                                                                                                              |
| `itemsScrollAttributes` | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the inner scrollable wrapper.                                                                                                                                                                                                                                             |
| `backdropClassName`     | `string \| undefined`                                    | —       | CSS class for the backdrop.                                                                                                                                                                                                                                                                            |
| `backdropAttributes`    | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the backdrop element.                                                                                                                                                                                                                                                     |
| `groupClassName`        | `string \| undefined`                                    | —       | CSS class applied to each group wrapper.                                                                                                                                                                                                                                                               |
| `groupAttributes`       | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto each group wrapper.                                                                                                                                                                                                                                                       |
| `separatorClassName`    | `string \| undefined`                                    | —       | CSS class applied to the separator rendered between adjacent groups.                                                                                                                                                                                                                                   |
| `separatorAttributes`   | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto each group separator.                                                                                                                                                                                                                                                     |
| `className`             | `string \| undefined`                                    | —       | CSS class applied to the outer Menu root element.                                                                                                                                                                                                                                                      |
| `attributes`            | `ReadonlyArray<ChildAttribute> \| undefined`             | —       | Extra attributes spread onto the outer Menu root element.                                                                                                                                                                                                                                              |
| `ariaLabel`             | `string`                                                 | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                           |
| `ariaLabelledBy`        | `string`                                                 | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                               |

### OutMessage {#out-message}

Messages emitted to the parent through the optional `outMessage` field. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config.

| Name       | Type                             | Default | Description                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected` | `{ value: Item; index: number }` | —       | Emitted when a menu item is selected. Carries both the value (typed as your `Item` union via `Menu.create<Item>()`) and its index into the items array supplied at view time. Menu closes itself on selection; the parent does not need to dispatch Menu.close. Fold it in the `foldOutMessage` of your Menu fold to dispatch the corresponding domain action. |
