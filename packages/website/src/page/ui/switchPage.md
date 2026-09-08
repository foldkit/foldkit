# Switch

## Overview

An on/off toggle. Switch represents an immediate action, such as turning on a light. Checkbox represents a form value that gets submitted. Switch is a stateless controlled render helper with the same wiring as Checkbox: your Model owns the value passed as `isChecked`, and `onToggle` turns an interaction into a Message for update to store.

:::Info{label="See it in an app"}
Check out how Switch is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/switch.ts).
:::

## Examples

The switch renders as a `<button>` with `role="switch"`. The typical visual is a track with a sliding knob, styled with the `data-checked` attribute for the on state.

::Demo{name="basic"}

::Snippet{name="uiSwitchBasic" label="switch example"}

## Styling

Switch is headless. Your `toView` callback controls all markup and styling. Use `data-[checked]` to change the track color and translate the knob, and the data attributes below to style the disabled and read-only states.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-checked`  | Present when the switch is on.   |
| `data-disabled` | Present when isDisabled is true. |
| `data-readonly` | Present when isReadOnly is true. |

## Keyboard Interaction

| Key     | Description                                                             |
| ------- | ----------------------------------------------------------------------- |
| `Space` | Toggles the Switch when `isDisabled` and `isReadOnly` are both `false`. |

## Accessibility

The switch button receives `role="switch"` and `aria-checked`. The label is linked via `aria-labelledby` and the description via `aria-describedby`. Clicking the label toggles the switch.

The `label` attribute group includes an id (accessible via `Switch.labelId(id)`) and the `description` group includes an id (accessible via `Switch.descriptionId(id)`), so a consumer can reference either element without re-declaring the naming convention.

`isReadOnly` and `isDisabled` both stop the Switch from reacting to clicks and Space. They differ in the semantics exposed to assistive technology, so they are not interchangeable.

`aria-disabled="true"`, which `isDisabled` emits, communicates that the Switch is unavailable. `aria-readonly="true"`, which `isReadOnly` emits, communicates that its value cannot be changed but remains relevant to the user. Both states keep `tabindex="0"`, following Foldkit's convention that unavailable controls remain discoverable by keyboard and assistive technology.

Assistive technology support for `aria-readonly` on switches varies. Pair it with a visible read-only treatment or explanatory text when users must distinguish it from disabled, and test the browser and assistive technology combinations your app supports.

Use `isReadOnly` when the on/off state is still information the user needs, such as a setting controlled elsewhere, and `isDisabled` when the Switch is unavailable.

The two flags are independent. Setting both emits both sets of attributes, and either one on its own removes the click and Space handlers.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Switch.view()`.

| Name         | Type                                     | Default | Description                                                                                                                          |
| ------------ | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | `string`                                 | —       | Unique ID for the switch instance. Used to link the label and description via ARIA.                                                  |
| `isChecked`  | `boolean`                                | —       | The current on/off state, read from your Model. `aria-checked` and the `data-checked` marker derive from it.                         |
| `onToggle`   | `(isChecked: boolean) => Message`        | —       | Maps the new on/off state to a Message when the user toggles the switch. Store that value in update.                                 |
| `toView`     | `(attributes: SwitchAttributes) => Html` | —       | Callback that receives attribute groups for the button, label, description, and hidden input elements.                               |
| `isDisabled` | `boolean`                                | `false` | Whether the switch is disabled.                                                                                                      |
| `isReadOnly` | `boolean`                                | `false` | Whether the switch is readable but not toggleable. Carries `aria-readonly` rather than `aria-disabled`. Independent of `isDisabled`. |
| `name`       | `string`                                 | —       | Form field name. When provided, a hidden input is included for native form submission.                                               |
| `value`      | `string`                                 | `'on'`  | Value sent in the form when checked.                                                                                                 |

### SwitchAttributes {#switch-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                                                                              |
| ------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `button`      | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the switch button element. Includes role, aria-checked, tabindex, click/keyboard handlers, and `type="button"` so a switch inside a form does not submit it. |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the label element. Includes an id for aria-labelledby and a click handler that toggles the switch.                                                           |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id referenced by aria-describedby on the switch.                                                                          |
| `hiddenInput` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input>` for form submission. Only needed when the name prop is set.                                                                               |
