# Listbox

## Overview

A custom select dropdown with keyboard navigation, typeahead search, and anchor positioning. Unlike Menu (which is for actions), Listbox is for choosing a value. The parent owns the selection: it passes the chosen value in as `maybeSelectedValue` (multi-select passes `selectedValues`) and folds the `Selected` OutMessage into its own state (single-select stores the value, multi-select toggles the value in its array). For a searchable input with filtering, use Combobox instead.

Embed Listbox via the [`create<Item, Value?>()` factory](/ui/selection-submodels) at module scope: `const PlanListbox = Listbox.create<Plan>()`. The factory binds the view, update, and imperative helpers to the same `Item` type so the selected value flows through the OutMessage typed end-to-end.

For programmatic control in update functions, use the factory instance helpers `PlanListbox.open(model)`, `PlanListbox.close(model)`, and `PlanListbox.selectItem(model, item)`. Each returns `[Model, Commands, Option<OutMessage>]` directly.

What the factory returns is typed [`Listbox.Bundle<Item, Value>`](/ui/selection-submodels#bundle-type) (`Listbox.Multi.Bundle` for the multi-select variant), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how Listbox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/listbox.ts).
:::

## Examples

### Single-Select {#single-select-listbox}

Pass an `itemToConfig` callback that maps each item to its content. The context provides `isSelected` and `isActive` for styling the highlighted and selected states.

::Demo{name="basic"}

::Snippet{name="uiListboxBasic" label="listbox example"}

### Multi-select {#multi-select-listbox}

Use `Listbox.Multi` for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and folds each `Selected` OutMessage by toggling the value in its array.

::Demo{name="multi-select"}

::Snippet{name="uiListboxMulti" label="multi-select listbox example"}

### Grouped {#grouped-listbox}

Pass `itemGroupKey` to group contiguous items by key, and `groupToHeading` to render section headers. Groups are separated automatically.

::Demo{name="grouped"}

::Snippet{name="uiListboxGrouped" label="grouped listbox example"}

## Read-Only {#read-only}

`isReadOnly` keeps the Listbox browsable but not committable. It still opens from the button by click, `Enter`, `Space`, `Arrow Down`, and `Arrow Up`, and still closes by `Escape`, a backdrop click, and blur. Arrow, `Home`, `End`, `PageUp`, and `PageDown` navigation, typeahead search, and pointer hover all keep moving the active item. What a read-only Listbox never does is commit: items carry no click handler, and `Enter` or `Space` on the active item inside the items panel reports a `SuppressedItemCommit` Message that leaves the Model unchanged, so no `Selected` OutMessage ever reaches the parent. `Space` still types into a pending typeahead query, because there the key is a search character rather than a commit.

`isReadOnly` describes what the user may do, not what the program may do. `selectItem` and the `SelectedItem` Message still select, because the parent owns the selection.

`isReadOnly` and `isDisabled` both stop the Listbox from committing a selection, and setting both emits both attribute sets. They differ in the semantics exposed to assistive technology, so they are not interchangeable. `aria-disabled="true"`, which `isDisabled` emits on the button, communicates that the Listbox is unavailable, and it removes the button's handlers so the dropdown cannot be opened at all. `aria-readonly="true"`, which `isReadOnly` emits on the items panel carrying `role="listbox"`, communicates that the selection cannot be changed but remains relevant to the user.

Assistive technology support for `aria-readonly` on listboxes varies. Pair it with a visible read-only treatment or explanatory text when users must distinguish it from disabled, and test the browser and assistive technology combinations your app supports.

Use `isReadOnly` when the selection is still information the user needs, such as a plan chosen earlier in a flow, and `isDisabled` when the Listbox is unavailable.

## Styling

Listbox is headless. The `itemToConfig` callback controls all item markup. Use `data-active` for the keyboard/pointer highlight and `data-selected` for the persistent selection indicator.

The items panel is portaled to the document body and positioned relative to the trigger button with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling listbox wrapper cannot hide an open dropdown. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Pass `anchor: { portal: false }` to keep the panel inside the wrapper instead.

To make the items panel match the trigger button width, set `width: var(--button-width)` (or Tailwind `w-(--button-width)`) on the items class. The anchor system writes the trigger button’s measured width to this CSS variable on the items element every time it positions the panel, so the panel always matches the button even as content or viewport sizes change. Without it, the items panel sizes to its content.

| Attribute        | Condition                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-open`      | Present on button and wrapper when the dropdown is open.                                                                                                        |
| `data-active`    | Present on the item currently highlighted by keyboard or pointer.                                                                                               |
| `data-selected`  | Present on selected item(s).                                                                                                                                    |
| `data-disabled`  | Present on disabled items, and on the button and the wrapper when the listbox is disabled.                                                                      |
| `data-readonly`  | Present on the wrapper, the button, the items panel, and every item when isReadOnly is true.                                                                    |
| `data-invalid`   | Present on the button and wrapper when isInvalid is true.                                                                                                       |
| `data-closed`    | Present during close animation when isAnimated is true.                                                                                                         |
| `data-placement` | Present on the items panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

Listbox uses typeahead search: typing printable characters jumps to the first matching item. Characters accumulate for 350ms before the search resets.

| Key                | Description                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Enter / Space`    | Opens the dropdown (from button) or selects the active item (from items). Read-only reports `SuppressedItemCommit` instead of selecting. |
| `Arrow Down`       | Opens with first item active (from button) or moves to next item.                                                                        |
| `Arrow Up`         | Opens with last item active (from button) or moves to previous item.                                                                     |
| `Home`             | Moves to the first enabled item.                                                                                                         |
| `End`              | Moves to the last enabled item.                                                                                                          |
| `Escape`           | Closes the dropdown and returns focus to the button.                                                                                     |
| `Type a character` | Typeahead search: jumps to the first matching item. Accumulates characters for 350ms.                                                    |

`Space` reaches the commit path only when no search query is pending; with one in flight it types into the query instead. Opening, closing, navigation, and typeahead are unaffected by `isReadOnly`. See [Read-Only](#read-only).

## Accessibility

The button receives `aria-haspopup="listbox"` and `aria-expanded`. The items container receives `role="listbox"` with `aria-activedescendant` tracking the highlighted item. Each item receives `role="option"` with `aria-selected`. The items container also receives `aria-readonly="true"` when `isReadOnly` is set. See [Read-Only](#read-only).

The trigger is a form field, so give it an accessible name. For a visible label, wire a native `<label for>` that targets the trigger id with `Listbox.buttonId(id)` rather than hardcoding the `-button` convention. The `for` association makes the trigger properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses and opens the listbox. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only trigger with no visible label, or `ariaLabelledBy` when the element that names the trigger is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Listbox.init()` or `Listbox.Multi.init()`.

| Name          | Type                         | Default      | Description                                                                                                                                          |
| ------------- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`                     | —            | Unique ID for the listbox instance.                                                                                                                  |
| `isAnimated`  | `boolean`                    | `false`      | Enables animation coordination for open/close animations.                                                                                            |
| `isModal`     | `boolean`                    | `false`      | Locks page scroll and marks other elements inert when open.                                                                                          |
| `orientation` | `'Vertical' \| 'Horizontal'` | `'Vertical'` | Whether items flow vertically or horizontally. Sets aria-orientation and switches keyboard navigation to Arrow Left and Arrow Right when Horizontal. |

### ViewConfig {#view-config}

Configuration object passed to the view returned by `Listbox.create()`. The same structure is used for the view returned by `Listbox.Multi.create()`.

| Name                 | Type                                               | Default | Description                                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`              | `Listbox.Model`                                    | —       | The listbox state from your parent Model.                                                                                                                                                                                                                                                              |
| `toParentMessage`    | `(childMessage: Listbox.Message) => ParentMessage` | —       | Wraps Listbox Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                            |
| `items`              | `ReadonlyArray<Item>`                              | —       | The list of items. The generic Item type narrows the value passed to itemToConfig.                                                                                                                                                                                                                     |
| `maybeSelectedValue` | `Option<Value>`                                    | —       | The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: `ReadonlyArray<Value>` instead. Drives the isSelected context and aria-selected.                                                                                                                  |
| `itemToConfig`       | `(item, context) => ItemConfig`                    | —       | Maps each item to its className and content. The context provides isActive, isSelected, isDisabled, and isReadOnly.                                                                                                                                                                                    |
| `buttonContent`      | `Html`                                             | —       | Content rendered inside the listbox button (typically the selected value).                                                                                                                                                                                                                             |
| `itemToValue`        | `(item: Item) => Value`                            | —       | Extracts the value from an item. Optional when Item is a string, defaulting to the item itself. Required when items are objects.                                                                                                                                                                       |
| `isItemDisabled`     | `(item, index) => boolean`                         | —       | Disables individual items.                                                                                                                                                                                                                                                                             |
| `itemGroupKey`       | `(item, index) => string`                          | —       | Groups contiguous items by key. Use with groupToHeading to render section headers.                                                                                                                                                                                                                     |
| `groupToHeading`     | `(groupKey) => GroupHeading \| undefined`          | —       | Renders a heading for each group.                                                                                                                                                                                                                                                                      |
| `anchor`             | `AnchorConfig`                                     | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the button; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper. |
| `name`               | `string`                                           | —       | Form field name. Creates hidden input(s) with the selected value(s).                                                                                                                                                                                                                                   |
| `isDisabled`         | `boolean`                                          | `false` | Disables the entire listbox.                                                                                                                                                                                                                                                                           |
| `isReadOnly`         | `boolean`                                          | `false` | Keeps the Listbox openable, navigable, and searchable while making item clicks and the Enter and Space commit inert. Carries `aria-readonly` on the items panel. Independent of `isDisabled`. See [Read-Only](#read-only).                                                                             |
| `isInvalid`          | `boolean`                                          | `false` | Marks the listbox as invalid for validation styling.                                                                                                                                                                                                                                                   |
| `ariaLabel`          | `string`                                           | —       | Accessible name for the trigger button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                           |
| `ariaLabelledBy`     | `string`                                           | —       | Id of an external element that labels the trigger button, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                               |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config. The same shape applies to the update returned by `Listbox.Multi.create()`, as in `PeopleListbox.update`.

| Name       | Type               | Default | Description                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected` | `{ value: Value }` | —       | Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Fold it in the `foldOutMessage` of your Listbox fold to lift the value into the selection you own. A read-only Listbox never emits it. |
