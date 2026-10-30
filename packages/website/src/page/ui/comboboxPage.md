# Combobox

## Overview

A searchable select with input filtering, keyboard navigation, and anchor positioning. Unlike Listbox (which uses a button trigger), Combobox has a text input for searching. You control the filtering logic: read the Combobox's `inputValue`, as in `model.combobox.model.inputValue`, and pass the filtered items array. The parent owns the selection: it passes the chosen value in as `maybeSelectedValue` (multi-select passes `selectedValues`) along with `restingInputValue` (the text the input rests at when closed), and stores what the `Selected` and `ClearedSelection` OutMessages report in its own state (single-select stores the value, multi-select toggles the value in its array).

### Create a Typed Combobox

Call the [`Combobox.makeBlock(Item)` factory](/ui/selection-blocks) once at module scope: `const CityCombobox = Combobox.makeBlock(City)`. Pass the same string Schema used by the parent Model. The factory returns a Block class with its Layer attached as `Live`. Its view, Message, and OutMessage all retain that Schema's exact type, so `Selected` carries a `City`. Use `Combobox.makeBlock(Schema.String)` for plain strings.

Create an instance in the parent's constructor with `yield* new CityCombobox('combobox', { id: 'city' })` and hold it in the parent Model. Render it with `model.combobox.view({ ... })`, handle its OutMessages with `...combobox.on({ ... })`, and provide `CityCombobox.Live` to the parent's Layer. See [Hold child instances in the Model](/core/block#embedding).

The class type is [`ComboboxClass<Item>` from `@foldkit/ui/combobox`](/ui/selection-blocks#completed-type), and an instance is `Combobox<Item>`. The multi-select subpath exports its own `ComboboxClass` and `Combobox` types for cases where either has to be named.

### Controlling a Combobox from the Parent

To control the Combobox from a parent update handler, send it one of these Messages:

- `CityCombobox.Message.RequestedOpen()` opens it.
- `RequestedClose({ restingInputValue, isClearable })` closes it and restores the input to `restingInputValue`. With `isClearable: true`, a nullable Combobox whose input is empty reports `ClearedSelection`.
- `RequestedSelectItem({ item, displayText })` selects `item` and shows `displayText` in the input.

Multi-select takes the same Messages. Pass `restingInputValue: ''` to `RequestedClose`, and pass the item itself as `displayText`.

:::Info{label="See it in an app"}
Check out how Combobox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/page/comboboxPage.ts).
:::

## Examples

### Single-Select

Pass `itemToValue` and `itemToDisplayText` to control how items map to values and what text appears in the input on selection. Filter the `items` array yourself based on `model.inputValue`.

::Demo{name="single-select"}

::Snippet{name="uiComboboxBasic" label="Combobox"}

### Nullable

Pass `nullable: true` when you create the instance to allow clearing the selection by clicking the selected item again, or by emptying the input and closing. Both paths reach the parent as OutMessages (`Selected` toggles, `ClearedSelection` clears), so the parent decides what an empty selection looks like.

`nullable` governs the single-select input only. A multi-select never emits `ClearedSelection`, because its input rests empty by design and so an empty input on close carries no intent to clear. Clearing a multi-select is toggling its values off, one `Selected` at a time.

::Demo{name="nullable"}

### Select on Focus

Pass `selectInputOnFocus: true` when you create the instance to highlight the input text when the combobox receives focus. Typing immediately replaces the current value, making it easy to start a new search.

::Demo{name="select-on-focus"}

### Locked Placement

Set `anchor.isPlacementLocked` to `true` when a panel should keep the side chosen when it opens, even if its size changes. Focus the input, then type `Zurich`. The tall list initially opens above the input. After filtering, the list is short enough to fit below, but it stays above until it closes.

To make the behavior reproducible at any scroll position, this demo keeps the panel inside a constrained container. In normal use, you can leave the portal enabled.

::Demo{name="locked-placement"}

### Multi-Select

Use `Combobox.Multi.makeBlock(Item)` for multi-selection. The dropdown stays open on selection and items toggle on/off. The parent stores the selected values and handles each `Selected` OutMessage by toggling the value in its array.

::Demo{name="multi"}

::Snippet{name="uiComboboxMulti" label="Multi-select combobox"}

## Read-Only

### Browsing Without Committing

`isReadOnly` keeps the Combobox browsable but not committable. It still opens from `Arrow Down`, `Arrow Up`, the toggle button, and `openOnFocus`, still navigates with `Arrow Down`, `Arrow Up`, `Home`, and `End`, still tracks the active item through `aria-activedescendant` and pointer hover, and still closes on `Escape`, blur, and a backdrop click. The input still takes focus, and its text can still be selected and copied.

#### Commit Paths Are Inert

What a read-only Combobox never does is commit. Its input carries the native `readonly` attribute and no `OnInput` handler, so typing cannot change the value. Items carry no click handler. `Enter` on the active item reports a `SuppressedItemCommit` Message that leaves the Model unchanged. An `immediate` Combobox stops committing as the arrow keys move. No `Selected` OutMessage reaches the parent through any of them.

#### Closing Preserves the Selection

Closing does not change the selection either. A nullable Combobox normally reads an empty input on close as the user clearing it and emits `ClearedSelection`; a read-only one never does, so a user who opens and closes it, by `Escape`, blur, the toggle button, or a backdrop click, leaves the parent's selection exactly as it was. This matters most for multi-select, whose input rests empty by design, and for a single-select whose input was never seeded. A parent that sends `RequestedClose` with `isClearable: true` can still clear the selection.

### Typing and Opening

Typing is frozen rather than left to filter, because `model.inputValue` is one field serving two purposes. It is the filter query you read to narrow `items`, and it is the display of the current selection, restored to `restingInputValue` on close and on blur. Letting a read-only Combobox be typed into would give the user a widget whose visible value they can change and which only snaps back on blur.

Freezing typing removes an open path along with it. An interactive Combobox opens on the first keystroke, since `UpdatedInputValue` opens a closed one, which makes clicking into the input feel like it opens the dropdown. A read-only Combobox has no `OnInput` handler, so that path is gone and the toggle button and the arrow keys are what remain. Pass `openOnFocus` when focusing the input should open it; it is unaffected by `isReadOnly`.

### Programmatic Changes

`isReadOnly` describes what the user may do, not what the program may do. A `RequestedSelectItem` Message from the parent still selects, because the parent owns the selection.

### Displaying an Existing Selection

A read-only single-select Combobox whose parent holds a preloaded selection renders an empty input until an open and close cycle happens, since `model.inputValue` starts empty and only becomes the selection's display text through a selection or a close. Read-only removes the user's usual recovery path, since they cannot type to surface it. Send the Combobox `RequestedSelectItem({ item, displayText })` with the preloaded selection when the parent appears. This sets `inputValue` to the display text. Because a constructor cannot send Messages, return a `start` Command whose result Message the parent handles by sending `RequestedSelectItem`, the same shape as [starting with an open Dialog](/ui/dialog#starting-with-an-open-dialog).

Seeding interacts with filtering. You derive `items` from `model.inputValue`, so a read-only Combobox seeded with its selection opens showing only the items matching that text, often just the one. Filter on a separate field, or skip filtering while read-only, when the full list should stay visible.

### Multi-Select Display

Multi-select needs neither, and needs something else instead. Its `restingInputValue` is an empty string by design, so the input never displays the selection and there is nothing to seed. That leaves the open panel, where `aria-selected` and the `isSelected` context mark the chosen items, as the only place the component shows what is selected. Render the selection yourself from the `selectedValues` you already own, as a tag or chip list beside the Combobox, so a read-only multi-select reads as something other than an empty frozen input.

### Read-Only and Disabled States

#### ARIA Semantics

`isReadOnly` and `isDisabled` both stop the Combobox from committing, and setting both emits both attribute sets. They differ in the semantics exposed to assistive technology, so they are not interchangeable. `aria-disabled="true"`, which `isDisabled` emits on the input and the toggle button, communicates that the Combobox is unavailable, and it removes their handlers so the dropdown cannot be opened at all. `aria-readonly="true"`, which `isReadOnly` emits on the input carrying `role="combobox"` and on the items panel carrying `role="listbox"`, communicates that the value cannot be changed but remains relevant to the user.

#### Choosing a State

Assistive technology support for `aria-readonly` on comboboxes varies. Pair it with a visible read-only treatment or explanatory text when users must distinguish it from disabled, and test the browser and assistive technology combinations your app supports.

Use `isReadOnly` when the selection is still information the user needs, such as a city chosen earlier in a flow, and `isDisabled` when the Combobox is unavailable.

## Styling

Combobox is headless. The `itemToConfig` callback controls all item markup. Style the input, button, items container, and backdrop through their respective attribute props.

The items panel is portaled to the document body and positioned relative to the input wrapper with Floating UI. Ancestor stacking contexts and overflow clipping do not apply to it, so a clipped container or a sibling overlay wrapper cannot hide the open panel. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with `z-10`. Inside a `<dialog>`, the panel is portaled into that dialog, so it renders above the dialog's content and stays interactive. Keep the outer Combobox wrapper positioned, for example with `className: 'relative'`, so the input paints above the click-outside backdrop. Pass `anchor: { portal: false }` to keep the panel inside the wrapper.

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

While an input method is composing, these keys stay with the composition. Enter confirms the conversion instead of selecting the active item.

Opening, closing, and arrow, `Home`, and `End` navigation are unaffected by `isReadOnly`. See [Read-Only](#read-only).

### Empty Results

When filtering leaves no items, the listbox disappears and navigation keys have no item to activate. The input stays focused. A modal Combobox keeps its backdrop available, so Escape and a backdrop click still close it and release the page. Render a visible and announced "No results" status in your view if users need feedback about the empty search.

## Accessibility

### Combobox Semantics

The input receives `role="combobox"` with `aria-expanded` and `aria-activedescendant`. The items container receives `role="listbox"` and each item receives `role="option"` with `aria-selected`. The input also receives the native `readonly` attribute and `aria-readonly="true"`, and the items container receives `aria-readonly="true"`, when `isReadOnly` is set. The ARIA attribute is emitted on the input in addition to the native one because the explicit `role="combobox"` overrides the element's native semantics, so the native attribute alone is not exposed to assistive technology. See [Read-Only](#read-only).

When the filtered listbox disappears, the input reports `aria-expanded="false"` and drops `aria-controls` and `aria-activedescendant` rather than pointing at missing elements.

### Naming the Input

The input is a form field, so give it an accessible name. For a visible label, wire a native `<label for>` that targets the input id with `inputId(id)` imported from `@foldkit/ui/combobox` rather than hardcoding the `-input` convention. The `for` association makes the input properly labeled: assistive technology announces it by the visible label text, and clicking the label focuses the input. That is why it is the recommended pattern.

Two view input fields cover the cases a `<label for>` does not. Pass `ariaLabel` when there is no visible label, or `ariaLabelledBy` when the element that names the input is not a `<label>` you can point `for` at.

## API Reference

### InitConfig {#init-config}

The args a parent passes when it creates an instance with `new`, for both `Combobox.makeBlock(Item)` and `Combobox.Multi.makeBlock(Item)`.

| Name                 | Type      | Default | Description                                                                                                                                                                                                                                                        |
| -------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                 | `string`  | —       | Unique ID for the combobox instance.                                                                                                                                                                                                                               |
| `isAnimated`         | `boolean` | `false` | Enables animation coordination.                                                                                                                                                                                                                                    |
| `isModal`            | `boolean` | `false` | Locks page scroll and marks other elements inert when open.                                                                                                                                                                                                        |
| `nullable`           | `boolean` | `false` | Allows clearing the selection by clicking the selected item again, or by emptying the single-select input and closing (which emits ClearedSelection). Multi-select never emits ClearedSelection.                                                                   |
| `immediate`          | `boolean` | `false` | Emits Selected on every keyboard activation while open, so arrow keys commit as they move instead of waiting for Enter. Combining immediate with nullable is discouraged: a nullable toggle handler would deselect as the arrows pass back over the selected item. |
| `selectInputOnFocus` | `boolean` | `false` | Highlights the input text when the combobox receives focus, so typing replaces the current value.                                                                                                                                                                  |

### ViewInputs {#view-config}

Pass these fields to the instance's `view`, as in `model.combobox.view({ ... })`. Spread the attribute groups the component passes to your callbacks unchanged, and wrap handler-bearing attributes you pass in with `childAttributes`. See [View input](/core/block#callback-dispatch-boundaries).

| Name                                             | Type                                              | Default | Description                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `items`                                          | `ReadonlyArray<Item>`                             | —       | The filtered list of items to display. You control the filtering logic based on model.inputValue.                                                                                                                                                                                                                                           |
| `maybeSelectedValue`                             | `Option<Item>`                                    | —       | The selection the parent owns. None when nothing is selected yet. Multi-select takes selectedValues: `ReadonlyArray<Item>` instead. Drives the isSelected context and aria-selected.                                                                                                                                                        |
| `restingInputValue`                              | `string`                                          | —       | The text the input returns to when the combobox closes: the selected display text for single-select, an empty string for multi-select.                                                                                                                                                                                                      |
| `itemToConfig`                                   | `(item, context) => ItemConfig`                   | —       | Maps each item to its className and content. The context provides isActive, isSelected, isDisabled, and isReadOnly.                                                                                                                                                                                                                         |
| `itemToValue`                                    | `(item: Item, index: number) => Item`             | —       | Extracts the value from an item.                                                                                                                                                                                                                                                                                                            |
| `itemToDisplayText`                              | `(item: Item, index: number) => string`           | —       | Text shown in the input when an item is selected.                                                                                                                                                                                                                                                                                           |
| `isItemDisabled`                                 | `(item: Item, index: number) => boolean`          | —       | Disables individual items.                                                                                                                                                                                                                                                                                                                  |
| `inputClassName / inputAttributes`               | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the text input.                                                                                                                                                                                                                                                                                    |
| `inputPlaceholder`                               | `string`                                          | —       | Placeholder text for the input.                                                                                                                                                                                                                                                                                                             |
| `inputWrapperClassName / inputWrapperAttributes` | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the input wrapper.                                                                                                                                                                                                                                                                                 |
| `itemsClassName / itemsAttributes`               | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the dropdown items panel.                                                                                                                                                                                                                                                                          |
| `itemsScrollClassName / itemsScrollAttributes`   | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the inner scrollable item wrapper.                                                                                                                                                                                                                                                                 |
| `backdropClassName / backdropAttributes`         | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the backdrop overlay.                                                                                                                                                                                                                                                                              |
| `buttonContent`                                  | `Html`                                            | —       | Content for the dropdown toggle button, typically a chevron icon.                                                                                                                                                                                                                                                                           |
| `buttonClassName / buttonAttributes`             | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the toggle button.                                                                                                                                                                                                                                                                                 |
| `className / attributes`                         | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for the outer Combobox wrapper.                                                                                                                                                                                                                                                                        |
| `formName`                                       | `string`                                          | —       | Form field name. Creates hidden input(s) with the selected value(s).                                                                                                                                                                                                                                                                        |
| `anchor`                                         | `AnchorConfig`                                    | —       | Floating positioning config: placement, gap, offset, padding, isPlacementLocked, and portal. The items panel is always anchored to the input wrapper; when omitted, the panel uses bottom-start placement. Portaled to the document body, or into an enclosing dialog, by default; pass portal: false to keep the panel inside its wrapper. |
| `isDisabled`                                     | `boolean`                                         | `false` | Marks the Combobox unavailable, with `aria-disabled="true"` on the input and the toggle button and `data-disabled` on both plus the wrapper, and removes their handlers so the dropdown cannot be opened.                                                                                                                                   |
| `isReadOnly`                                     | `boolean`                                         | `false` | Keeps the Combobox openable, navigable, and closable while freezing the input and making item clicks, the Enter commit, and the immediate arrow-commit inert. Carries the native readonly attribute and aria-readonly on the input, and aria-readonly on the items panel. Independent of isDisabled. See [Read-Only](#read-only).           |
| `isInvalid`                                      | `boolean`                                         | `false` | Marks the Combobox as invalid for validation styling and ARIA state.                                                                                                                                                                                                                                                                        |
| `openOnFocus`                                    | `boolean`                                         | `false` | Opens the Combobox when the input receives focus.                                                                                                                                                                                                                                                                                           |
| `itemGroupKey`                                   | `(item: Item, index: number) => string`           | —       | Groups contiguous items by key. Use with `groupToHeading` to render section headers.                                                                                                                                                                                                                                                        |
| `groupToHeading`                                 | `(groupKey: string) => GroupHeading \| undefined` | —       | Renders a heading for each group.                                                                                                                                                                                                                                                                                                           |
| `groupClassName / groupAttributes`               | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for each group wrapper.                                                                                                                                                                                                                                                                                |
| `separatorClassName / separatorAttributes`       | `string / ReadonlyArray<ChildAttribute>`          | —       | Class name and additional attributes for separators between adjacent groups.                                                                                                                                                                                                                                                                |
| `ariaLabel`                                      | `string`                                          | —       | Accessible name for the input. Use when there is no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                                                                                                                                                                                         |
| `ariaLabelledBy`                                 | `string`                                          | —       | Id of an external element that labels the input, applied as aria-labelledby. Pair with a visible label element.                                                                                                                                                                                                                             |

### OutMessage {#out-message}

Facts the Combobox reports to its parent, whether the user caused them or the parent sent a `Requested*` Message. Handle them by spreading `...combobox.on({ ... })` into the parent's update record; variants without a handler are ignored. To pass a fact further up, return the parent's own OutMessage from the handler. The payloads keep the exact item type of the Schema passed to `Combobox.makeBlock(Item)` or `Combobox.Multi.makeBlock(Item)`.

| Name               | Type              | Default | Description                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected`         | `{ value: Item }` | —       | Emitted when an item is activated. Carries the neutral fact that the item was activated; the parent owns the selection and decides what it means. Single-select stores the value; multi-select toggles the value in and out of its array. Handle it with the instance's `.on` to lift the value into the selection you own. A read-only Combobox never emits it. |
| `ClearedSelection` | `{}`              | —       | Emitted when a nullable single-select Combobox closes with an empty input, meaning the user cleared it. The parent clears the selection it owns. Multi-select never emits it, since its input rests empty by design. A read-only Combobox never emits it either, so opening and closing one cannot clear the selection.                                          |
