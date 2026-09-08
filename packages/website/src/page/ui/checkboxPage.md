# Checkbox

## Overview

A toggle with checked, unchecked, and indeterminate states. Checkbox is a stateless controlled render helper. Call it directly with a ViewConfig in your own view, with no Model, update, or `h.submodel` wrapping of its own. Your Model owns the value passed as `isChecked`, and `onToggle` turns an interaction into a Message for update to store. For an on/off toggle that represents an immediate action, such as a light switch, use Switch instead.

:::Info{label="See it in an app"}
Check out how Checkbox is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/checkbox.ts).
:::

## Examples

### Basic

The checkbox element is typically a `<button>`. Spread `attributes.checkbox` onto it for role, ARIA state, and keyboard/click handlers. The label click handler also toggles the checkbox.

::Demo{name="basic"}

::Snippet{name="uiCheckboxBasic" label="basic checkbox example"}

### Indeterminate

Pass `isIndeterminate: true` to show a mixed state. This is typically computed from child checkbox states: when some but not all children are checked, the parent shows the indeterminate mark. Toggling the parent sets all children to the same state.

::Demo{name="indeterminate"}

::Snippet{name="uiCheckboxIndeterminate" label="indeterminate checkbox example"}

## Styling

Checkbox is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style checked, indeterminate, disabled, and read-only states.

| Attribute            | Condition                                   |
| -------------------- | ------------------------------------------- |
| `data-checked`       | Present when checked and not indeterminate. |
| `data-indeterminate` | Present when isIndeterminate is true.       |
| `data-disabled`      | Present when isDisabled is true.            |
| `data-readonly`      | Present when isReadOnly is true.            |

## Keyboard Interaction

| Key     | Description                                                               |
| ------- | ------------------------------------------------------------------------- |
| `Space` | Toggles the Checkbox when `isDisabled` and `isReadOnly` are both `false`. |

## Accessibility

The checkbox element receives `role="checkbox"` and `aria-checked` which is set to `"true"`, `"false"`, or `"mixed"` depending on the checked and indeterminate state. The label is linked via `aria-labelledby` and the description via `aria-describedby`.

The `label` attribute group includes an id (accessible via `Checkbox.labelId(id)`) and the `description` group includes an id (accessible via `Checkbox.descriptionId(id)`), so a consumer can reference either element without re-declaring the naming convention.

`isReadOnly` and `isDisabled` both stop the Checkbox from reacting to clicks and Space. They differ in the semantics exposed to assistive technology, so they are not interchangeable.

`aria-disabled="true"`, which `isDisabled` emits, communicates that the Checkbox is unavailable. `aria-readonly="true"`, which `isReadOnly` emits, communicates that its value cannot be changed but remains relevant to the user. Both states keep `tabindex="0"`, following Foldkit's convention that unavailable controls remain discoverable by keyboard and assistive technology.

Assistive technology support for `aria-readonly` on checkboxes varies. Pair it with a visible read-only treatment or explanatory text when users must distinguish it from disabled, and test the browser and assistive technology combinations your app supports.

Use `isReadOnly` when the checked state is still information the user needs, such as a decision that was already made, and `isDisabled` when the Checkbox is unavailable.

The two flags are independent. Setting both emits both sets of attributes, and either one on its own removes the click and Space handlers.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Checkbox.view()`.

| Name              | Type                                       | Default | Description                                                                                                                            |
| ----------------- | ------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `id`              | `string`                                   | —       | Unique ID for the checkbox instance. Used to link the label and description via ARIA.                                                  |
| `isChecked`       | `boolean`                                  | —       | The current checked state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.                          |
| `onToggle`        | `(isChecked: boolean) => Message`          | —       | Maps the new checked state to a Message when the user toggles the checkbox. Store that value in update.                                |
| `toView`          | `(attributes: CheckboxAttributes) => Html` | —       | Callback that receives attribute groups for the checkbox, label, description, and hidden input elements.                               |
| `isDisabled`      | `boolean`                                  | `false` | Whether the checkbox is disabled.                                                                                                      |
| `isReadOnly`      | `boolean`                                  | `false` | Whether the checkbox is readable but not toggleable. Carries `aria-readonly` rather than `aria-disabled`. Independent of `isDisabled`. |
| `isIndeterminate` | `boolean`                                  | `false` | Whether to show the indeterminate (mixed) state. Useful for "select all" checkboxes where some but not all children are checked.       |
| `name`            | `string`                                   | —       | Form field name. When provided, a hidden input is included for native form submission.                                                 |
| `value`           | `string`                                   | `'on'`  | Value sent in the form when checked.                                                                                                   |

### CheckboxAttributes {#checkbox-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                                                                                                   |
| ------------- | ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkbox`    | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the checkbox element (typically a `<button>`). Includes role, aria-checked, tabindex, click/keyboard handlers, and `type="button"` so a control inside a form does not submit it. |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the checkbox.                                                                              |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id referenced by aria-describedby on the checkbox.                                                                                             |
| `hiddenInput` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input>` for form submission. Only needed when the name prop is set.                                                                                                    |
