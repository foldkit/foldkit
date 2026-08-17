# Combobox

## Overview

A searchable select with input filtering, keyboard navigation, and anchor positioning. Unlike Listbox (which uses a button trigger), Combobox has a text input for searching. You control the filtering logic: read `model.inputValue` and pass the filtered items array. The parent owns the selection: it passes the chosen value in as `maybeSelectedValue` (multi-select passes `selectedValues`) along with `restingInputValue` (the text the input rests at when closed), and folds the `Selected` and `ClearedSelection` OutMessages into its own state (single-select stores the value, multi-select toggles the value in its array).

Embed Combobox via the [`create<Item>()` factory](/ui/selection-submodels) at module scope: `const CityCombobox = Combobox.create<City>()`. The factory binds the view, update, and imperative helpers to the same `Item` type so the selected value flows through the OutMessage, typed end-to-end. Combobox constrains `Item extends string`.

For programmatic control in update functions, use `CityCombobox.open(model)`, `CityCombobox.close(model, restingInputValue)`, and `CityCombobox.selectItem(model, item, displayText)`. Each returns `[Model, Commands, Option<OutMessage>]` directly. Single-select `close` takes the resting input text (the selected display text, or empty); `Combobox.Multi` closes with `close(model)` since the multi-select input always rests empty.

What the factory returns is typed [`Combobox.Bundle<Item>`](/ui/selection-submodels#bundle-type) (`Combobox.Multi.Bundle` for the multi-select variant), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how Combobox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/combobox.ts).
:::

## Examples

### Single-Select

Pass `itemToValue` and `itemToDisplayText` to control how items map to values and what text appears in the input on selection. Filter the `items` array yourself based on `model.inputValue`.

::Demo{name="single-select"}

::Snippet{name="uiComboboxBasic" label="combobox example"}

### Nullable

Pass `nullable: true` at init to allow clearing the selection by clicking the selected item again, or by emptying the input and closing. Both paths reach the parent as OutMessages (`Selected` toggles, `ClearedSelection` clears), so the parent decides what an empty selection looks like.

`nullable` governs the single-select input only. A multi-select never emits `ClearedSelection`, because its input rests empty by design and so an empty input on close carries no intent to clear. Clearing a multi-select is toggling its values off, one `Selected` at a time.

::Demo{name="nullable"}

### Select on Focus

Pass `selectInputOnFocus: true` at init to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search.

::Demo{name="select-on-focus"}

### Locked Placement

Set `anchor.isPlacementLocked` to `true` when a panel should keep the side chosen when it opens, even if its size changes. Focus the input, then type `Zurich`. The tall list initially opens above the input. After filtering, the list is short enough to fit below, but it stays above until it closes.

To make the behavior reproducible at any scroll position, this demo keeps the panel inside a constrained container. In normal use, you can leave the portal enabled.

::Demo{name="locked-placement"}

### Multi-Select

Use `Combobox.Multi` for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and folds each `Selected` OutMessage by toggling the value in its array.

::Demo{name="multi"}

::Snippet{name="uiComboboxMulti" label="multi-select combobox example"}

## Read-Only

`isReadOnly` keeps the Combobox browsable but not committable. It still opens from `Arrow Down`, `Arrow Up`, the toggle button, and `openOnFocus`, still navigates with `Arrow Down`, `Arrow Up`, `Home`, and `End`, still tracks the active item through `aria-activedescendant` and pointer hover, and still closes on `Escape`, blur, and a backdrop click. The input still takes focus, and its text can still be selected and copied.

What a read-only Combobox never does is commit. Its input carries the native `readonly` attribute and no `OnInput` handler, so typing cannot change the value. Items carry no click handler. `Enter` on the active item reports a `SuppressedItemCommit` Message that leaves the Model unchanged. An `immediate` Combobox stops committing as the arrow keys move. No `Selected` OutMessage reaches the parent through any of them.

Closing does not change the selection either. A nullable Combobox normally reads an empty input on close as the user clearing it and emits `ClearedSelection`; a read-only one never does, so a user who opens and closes it, by `Escape`, blur, the toggle button, or a backdrop click, leaves the parent's selection exactly as it was. This matters most for multi-select, whose input rests empty by design, and for a single-select whose input was never seeded. The programmatic `close` helper is unaffected and clears as before.

Typing is frozen rather than left to filter, because `model.inputValue` is one field serving two purposes. It is the filter query you read to narrow `items`, and it is the display of the current selection, restored to `restingInputValue` on close and on blur. Letting a read-only Combobox be typed into would give the user a widget whose visible value they can change and which only snaps back on blur.

Freezing typing removes an open path along with it. An interactive Combobox opens on the first keystroke, since `UpdatedInputValue` opens a closed one, which makes clicking into the input feel like it opens the dropdown. A read-only Combobox has no `OnInput` handler, so that path is gone and the toggle button and the arrow keys are what remain. Pass `openOnFocus` when focusing the input should open it; it is unaffected by `isReadOnly`.

`isReadOnly` describes what the user may do, not what the program may do. `selectItem` and a directly dispatched `SelectedItem` Message still select, because the parent owns the selection.

A read-only single-select Combobox whose parent holds a preloaded selection renders an empty input until an open and close cycle happens, since `model.inputValue` starts empty and only becomes the selection's display text through a selection or a close. Read-only removes the user's usual recovery path, since they cannot type to surface it. Seed the Model at boot with `selectItem`, which sets `inputValue` to the display text; the `boot()` convention is the idiomatic place for that.

Seeding interacts with filtering. You derive `items` from `model.inputValue`, so a read-only Combobox seeded with its selection opens showing only the items matching that text, often just the one. Filter on a separate field, or skip filtering while read-only, when the full list should stay visible.

Multi-select needs neither, and needs something else instead. Its `restingInputValue` is an empty string by design, so the input never displays the selection and there is nothing to seed. That leaves the open panel, where `aria-selected` and the `isSelected` context mark the chosen items, as the only place the component shows what is selected. Render the selection yourself from the `selectedValues` you already own, as a tag or chip list beside the Combobox, so a read-only multi-select reads as something other than an empty frozen input.

`isReadOnly` and `isDisabled` both stop the Combobox from committing, and setting both emits both attribute sets. They differ in the semantics exposed to assistive technology, so they are not interchangeable. `aria-disabled="true"`, which `isDisabled` emits on the input and the toggle button, communicates that the Combobox is unavailable, and it removes their handlers so the dropdown cannot be opened at all. `aria-readonly="true"`, which `isReadOnly` emits on the input carrying `role="combobox"` and on the items panel carrying `role="listbox"`, communicates that the value cannot be changed but remains relevant to the user.

Assistive technology support for `aria-readonly` on comboboxes varies. Pair it with a visible read-only treatment or explanatory text when users must distinguish it from disabled, and test the browser and assistive technology combinations your app supports.

Use `isReadOnly` when the selection is still information the user needs, such as a city chosen earlier in a flow, and `isDisabled` when the Combobox is unavailable.

## Styling

Combobox is headless. The `itemToConfig` callback controls all item markup. Style the input, button, items container, and backdrop through their respective attribute props.

The items panel is portaled to the document body and positioned relative to the input wrapper with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling overlay wrapper cannot hide the open panel. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Pass `anchor: { portal: false }` to keep the panel inside the wrapper instead.

| Attribute        | Condition                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-active`    | Present on the item currently highlighted by keyboard or pointer.                                                                                               |
| `data-selected`  | Present on the selected item(s).                                                                                                                                |
| `data-disabled`  | Present on disabled items, and on the wrapper, the input, and the toggle button when the combobox is disabled.                                                  |
| `data-readonly`  | Present on the wrapper, the input, the toggle button, the items panel, and every item when isReadOnly is true.                                                  |
| `data-closed`    | Present during close animation when isAnimated is true.                                                                                                         |
| `data-placement` | Present on the items panel, set to the side it currently sits on: top, right, bottom, or left. Fixed to the first resolved side when isPlacementLocked is true. |

## Keyboard Interaction

Focus stays on the input while arrow keys navigate items via `aria-activedescendant`.

| Key                | Description                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `Arrow Down`       | Opens the dropdown or moves to the next item.                                                                        |
| `Arrow Up`         | Moves to the previous item.                                                                                          |
| `Enter`            | Selects the active item. Inert when isReadOnly is set.                                                               |
| `Home`             | Moves to the first enabled item.                                                                                     |
| `End`              | Moves to the last enabled item.                                                                                      |
| `Escape`           | Closes the dropdown.                                                                                                 |
| `Type a character` | Filters the items list. You control filtering in your view by passing filtered items. Frozen when isReadOnly is set. |

Opening, closing, and arrow, `Home`, and `End` navigation are unaffected by `isReadOnly`. See [Read-Only](#read-only).

## Accessibility

The input receives `role="combobox"` with `aria-expanded` and `aria-activedescendant`. The items container receives `role="listbox"` and each item receives `role="option"` with `aria-selected`. The input also receives the native `readonly` attribute and `aria-readonly="true"`, and the items container receives `aria-readonly="true"`, when `isReadOnly` is set. The ARIA attribute is emitted on the input in addition to the native one because the explicit `role="combobox"` overrides the element's native semantics, so the native attribute alone is not exposed to assistive technology. See [Read-Only](#read-only).

The input is a form field, so give it an accessible name. For a visible label, wire a native `<label for>` that targets the input id with `Combobox.inputId(id)` rather than hardcoding the `-input` convention. The `for` association makes the input properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses the input. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` when there is no visible label, or `ariaLabelledBy` when the element that names the input is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `Combobox.init()` or `Combobox.Multi.init()`.

| Name                 | Type      | Default | Description                                                                                                                                                                                                                                                     |
| -------------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `string`  | —       | Unique ID for the combobox instance.                                                                                                                                                                                                                            |
| `isAnimated`         | `boolean` | `false` | Enables animation coordination.                                                                                                                                                                                                                                 |
| `isModal`            | `boolean` | `false` | Locks page scroll and marks other elements inert when open.                                                                                                                                                                                                     |
| `nullable`           | `boolean` | `false` | Allows clearing the selection by clicking the selected item again, or by emptying the single-select input and closing (which emits ClearedSelection). Multi-select never emits ClearedSelection.                                                                |
| `immediate`          | `boolean` | `false` | Emits Selected on every keyboard activation while open, so arrow keys commit as they move instead of waiting for Enter. Combining immediate with nullable is discouraged: a nullable toggle fold would deselect as the arrows pass back over the selected item. |
| `selectInputOnFocus` | `boolean` | `false` | Highlights the input text when the combobox receives focus, so typing replaces the current value.                                                                                                                                                               |

### ViewConfig {#view-config}

Configuration object passed to `CityCombobox.view`.

| Name                 | Type                                                | Default | Description                                                                                                                                                                                                                                                                                                                       |
| -------------------- | --------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`              | `Combobox.Model`                                    | —       | The combobox state from your parent Model.                                                                                                                                                                                                                                                                                        |
| `toParentMessage`    | `(childMessage: Combobox.Message) => ParentMessage` | —       | Wraps Combobox Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                                                      |
| `items`              | `ReadonlyArray<Item>`                               | —       | The filtered list of items to display. You control the filtering logic based on model.inputValue.                                                                                                                                                                                                                                 |
| `maybeSelectedValue` | `Option<Item>`                                      | —       | The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: `ReadonlyArray<Item>` instead. Drives the isSelected context and aria-selected.                                                                                                                                              |
| `restingInputValue`  | `string`                                            | —       | The text the input returns to when the combobox closes: the selected display text for single-select, an empty string for multi-select.                                                                                                                                                                                            |
| `itemToConfig`       | `(item, context) => ItemConfig`                     | —       | Maps each item to its className and content. The context provides isActive, isSelected, isDisabled, and isReadOnly.                                                                                                                                                                                                               |
| `itemToValue`        | `(item: Item, index: number) => Item`               | —       | Extracts the value from an item. Required.                                                                                                                                                                                                                                                                                        |
| `itemToDisplayText`  | `(item: Item, index: number) => string`             | —       | Text shown in the input when an item is selected. Required.                                                                                                                                                                                                                                                                       |
| `inputAttributes`    | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the text input.                                                                                                                                                                                                                                                                                         |
| `itemsAttributes`    | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the dropdown items container.                                                                                                                                                                                                                                                                           |
| `backdropAttributes` | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the backdrop overlay.                                                                                                                                                                                                                                                                                   |
| `buttonContent`      | `Html`                                              | —       | Content for the dropdown toggle button (typically a chevron icon).                                                                                                                                                                                                                                                                |
| `buttonAttributes`   | `ReadonlyArray<Attribute<Message>>`                 | —       | Additional attributes for the toggle button.                                                                                                                                                                                                                                                                                      |
| `anchor`             | `AnchorConfig`                                      | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the input wrapper; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper.                     |
| `isDisabled`         | `boolean`                                           | `false` | Marks the Combobox unavailable, with `aria-disabled="true"` on the input and the toggle button and `data-disabled` on both plus the wrapper, and removes their handlers so the dropdown cannot be opened.                                                                                                                         |
| `isReadOnly`         | `boolean`                                           | `false` | Keeps the Combobox openable, navigable, and closable while freezing the input and making item clicks, the Enter commit, and the immediate arrow-commit inert. Carries the native readonly attribute and aria-readonly on the input, and aria-readonly on the items panel. Independent of isDisabled. See [Read-Only](#read-only). |
| `ariaLabel`          | `string`                                            | —       | Accessible name for the input. Use when there is no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                                                                               |
| `ariaLabelledBy`     | `string`                                            | —       | Id of an external element that labels the input, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                                                                   |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Fold the OutMessage in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config. The same shape applies to the update returned by `Combobox.Multi.create()`, as in `CitiesCombobox.update`.

| Name               | Type              | Default | Description                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected`         | `{ value: Item }` | —       | Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Fold it in the `foldOutMessage` of your Combobox fold to lift the value into the selection you own. A read-only Combobox never emits it. |
| `ClearedSelection` | `{}`              | —       | Emitted when a nullable single-select Combobox closes with an empty input, meaning the user cleared it. The parent clears the selection it owns. Multi-select never emits it, since its input rests empty by design. A read-only Combobox never emits it either, so opening and closing one cannot clear the selection.                                                            |
