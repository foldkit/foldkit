# Radio Group

## Overview

A single-selection component with roving tabindex keyboard navigation. Arrow keys simultaneously move focus and select the option. There is no separate focus-then-select step.

RadioGroup is a Submodel that keeps its own keyboard-focus state, but the parent owns the selection. Store the selected value in your Model, pass it in as `selectedValue`, and fold the `Selected` OutMessage back into that field in your `GotRadioGroupMessage` handler. Both vertical and horizontal orientation are supported.

What `RadioGroup.create<Value>()` returns is typed [`RadioGroup.Bundle<Value>`](/ui/selection-submodels#bundle-type), for the cases where a created bundle has to be named rather than called directly.

:::Info{label="See it in an app"}
Check out how RadioGroup is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/radioGroup.ts).
:::

## Examples

### Vertical

Declare the radio group once at module scope with `RadioGroup.create<Value>()` to lift the option type through `view` and `update` without casting. Read the current selection from your Model into `selectedValue`, pass the typed `options` array, and provide a `toView` callback that receives one `OptionInfo<Value>` per option (with attribute bundles for the option, label, and description).

In your `GotRadioGroupMessage` handler, delegate to the bundle's `update` and store the value the `Selected` OutMessage carries. Moving focus onto the newly-selected option is the radio group's own concern: it returns a `FocusOption` Command from its `update`, so the parent only has to pass the mapped Commands along.

::Demo{name="vertical"}

::Snippet{name="uiRadioGroupBasic" label="radio group example"}

### Horizontal

Pass `orientation: 'Horizontal'` in the view inputs to switch to left/right arrow navigation.

::Demo{name="horizontal"}

## Read-Only

`isReadOnly` keeps the group navigable but not selectable. Arrow, `Home`, `End`, `PageUp`, and `PageDown` still move focus, and the group reports each move as a `FocusedOption` Message, so the focused option is stored in the RadioGroup Model rather than left as an untracked DOM detail. `data-active`, `isActive`, and `tabindex` all follow that modeled focus, which means a read-only group's focus ring lands where the keyboard actually is instead of staying pinned to the selection. Space and clicking do nothing, and no `Selected` OutMessage ever reaches the parent.

`isReadOnly` and `isDisabled` both stop the group from committing a selection. They differ in the semantics exposed to assistive technology, so they are not interchangeable. `aria-disabled="true"`, which `isDisabled` emits on each option, communicates that the option is unavailable. `aria-readonly="true"`, which `isReadOnly` emits on the group, communicates that the selection cannot be changed but remains relevant to the user, and keyboard navigation stays intact so the user can read through the options.

Set both and disabled wins for interaction: a disabled option carries no click handler and no keydown handler, so nothing navigates. Both markers still render.

Use `isReadOnly` when the selection is still information the user needs, such as a plan chosen earlier in a flow, and `isDisabled` when the group is unavailable.

## Styling

RadioGroup is headless. The `toView` callback owns all option markup and styling, spreading the attribute bundles from each `OptionInfo` onto the consumer's elements. Use the data attributes below to style selected, focused, disabled, and read-only states.

| Attribute       | Condition                                                                   |
| --------------- | --------------------------------------------------------------------------- |
| `data-checked`  | Present on the selected option.                                             |
| `data-active`   | Present on the option that has focus (roving tabindex).                     |
| `data-disabled` | Present on disabled options.                                                |
| `data-readonly` | Present on the group element and on every option when `isReadOnly` is true. |

## Keyboard Interaction

RadioGroup uses roving tabindex: only the active option is in the tab order. Arrow keys move focus and select simultaneously. Disabled options are skipped during keyboard navigation.

| Key                  | Description                                                                    |
| -------------------- | ------------------------------------------------------------------------------ |
| `Arrow Down / Right` | Move focus and select the next option (wraps). Read-only moves focus only.     |
| `Arrow Up / Left`    | Move focus and select the previous option (wraps). Read-only moves focus only. |
| `Home / PageUp`      | Move focus and select the first option. Read-only moves focus only.            |
| `End / PageDown`     | Move focus and select the last option. Read-only moves focus only.             |
| `Space`              | Select the focused option. Inert when the group is read-only.                  |

## Accessibility

The group element receives `role="radiogroup"` and `aria-orientation`, plus `aria-readonly="true"` when `isReadOnly` is set. Each option receives `role="radio"` with `aria-checked`, `aria-labelledby`, and `aria-describedby`.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `RadioGroup.init()`.

| Name | Type     | Default | Description                                                                               |
| ---- | -------- | ------- | ----------------------------------------------------------------------------------------- |
| `id` | `string` | —       | Unique ID for the radio group instance. Used to link ARIA attributes and to target focus. |

### ViewConfig {#view-config}

Configuration object passed to the view returned by `RadioGroup.create<Value>()`.

| Name               | Type                                                  | Default      | Description                                                                                                                                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`            | `RadioGroup.Model`                                    | —            | The radio group state from your parent Model.                                                                                                                                                                                                                                                                                                       |
| `toParentMessage`  | `(childMessage: RadioGroup.Message) => ParentMessage` | —            | Wraps RadioGroup Messages in your parent Message type for Submodel delegation.                                                                                                                                                                                                                                                                      |
| `options`          | `ReadonlyArray<Value>`                                | —            | The list of option values, in display order. When the radio group is declared via `RadioGroup.create<MyUnion>()`, `Value` is your union type and each `OptionInfo.value` is typed as `MyUnion`.                                                                                                                                                     |
| `selectedValue`    | `Option<Value>`                                       | —            | The current selection, owned by the parent Model and passed back in on each render. `aria-checked` and the `data-checked` marker derive from it, as does the roving tabindex whenever focus has not diverged. Update it by folding the `Selected` OutMessage in your `GotRadioGroupMessage` handler. `Option.none()` renders with nothing selected. |
| `ariaLabel`        | `string`                                              | —            | Accessible label for the radio group.                                                                                                                                                                                                                                                                                                               |
| `toView`           | `(render: RenderInfo<Value>) => Html`                 | —            | Callback that receives the `group` attribute bundle, one `OptionInfo<Value>` per option, the current `selectedValue`, and the `hiddenInput` attributes. Returns the composed layout.                                                                                                                                                                |
| `orientation`      | `'Vertical' \| 'Horizontal'`                          | `'Vertical'` | Layout orientation. Controls arrow key direction and `aria-orientation`.                                                                                                                                                                                                                                                                            |
| `isOptionDisabled` | `(value: Value, index: number) => boolean`            | —            | Disables individual options.                                                                                                                                                                                                                                                                                                                        |
| `isDisabled`       | `boolean`                                             | `false`      | Disables all options. A disabled option carries neither a click handler nor a keydown handler.                                                                                                                                                                                                                                                      |
| `isReadOnly`       | `boolean`                                             | `false`      | Keeps arrow, Home, End, PageUp, and PageDown focus navigation while making Space and clicking inert. Carries `aria-readonly` on the group. Independent of `isDisabled`. See [Read-Only](#read-only).                                                                                                                                                |
| `name`             | `string`                                              | —            | Form field name. When provided, `RenderInfo.hiddenInput` carries the attributes for a hidden `<input>` holding the selected value (the consumer renders the element).                                                                                                                                                                               |

### RenderInfo {#render-info}

Payload delivered to the `toView` callback each render.

| Name            | Type                               | Default | Description                                                                                                                                                                |
| --------------- | ---------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `group`         | `ReadonlyArray<ChildAttribute>`    | —       | Spread onto the radio group container. Includes `role="radiogroup"`, `aria-orientation`, `aria-label`, and the read-only markers when `isReadOnly` is set.                 |
| `options`       | `ReadonlyArray<OptionInfo<Value>>` | —       | One entry per option in `options`, in the same order. See OptionInfo below.                                                                                                |
| `selectedValue` | `Option<Value>`                    | —       | The currently-selected value, if any. Convenient when rendering selected-state visuals next to the option attributes.                                                      |
| `hiddenInput`   | `ReadonlyArray<ChildAttribute>`    | —       | When `name` is supplied, attributes for a hidden form input carrying the selected value. The consumer renders the `<input>` element. Empty array when `name` is undefined. |

### OptionInfo {#option-info}

Each entry in `RenderInfo.options`. Carries the value, derived state flags, and attribute bundles for the option element, its label, and its description.

| Name          | Type                            | Default | Description                                                                                                                                                                                                             |
| ------------- | ------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`       | `Value`                         | —       | The option value. Typed as your `Value` union when the radio group is declared via `RadioGroup.create<Value>()`.                                                                                                        |
| `index`       | `number`                        | —       | Position in the `options` array.                                                                                                                                                                                        |
| `isSelected`  | `boolean`                       | —       | Whether this option is currently selected.                                                                                                                                                                              |
| `isActive`    | `boolean`                       | —       | Whether this option owns the roving tabindex (the one in the tab order). Follows the modeled focus, so in a read-only group it tracks keyboard navigation rather than the selection.                                    |
| `isDisabled`  | `boolean`                       | —       | Whether this option is disabled (either individually via `isOptionDisabled` or because `isDisabled` is set on the whole group).                                                                                         |
| `isReadOnly`  | `boolean`                       | —       | Whether the group is read-only.                                                                                                                                                                                         |
| `option`      | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the option element. Includes `role="radio"`, `aria-checked`, `aria-labelledby`, `aria-describedby`, `tabindex`, click/keyboard handlers, and `type="button"` so an option inside a form does not submit it. |
| `label`       | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the label element. Includes an id for `aria-labelledby`.                                                                                                                                                    |
| `description` | `ReadonlyArray<ChildAttribute>` | —       | Spread onto a description element. Includes an id for `aria-describedby`.                                                                                                                                               |

### OutMessage {#out-message}

Messages emitted to the parent through the third element of `[Model, Commands, Option<OutMessage>]`. Pattern-match on the OutMessage in your update handler.

| Name       | Type                              | Default | Description                                                                                                                                                                                                                                                                                                       |
| ---------- | --------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Selected` | `{ value: Value; index: number }` | —       | Emitted when an option is committed via click or keyboard. Carries both the option's value (typed as your `Value` union via `RadioGroup.create<Value>()`) and its index. A read-only group never emits it. Pattern-match the third tuple element of the bundle's `update` in your `GotRadioGroupMessage` handler. |
