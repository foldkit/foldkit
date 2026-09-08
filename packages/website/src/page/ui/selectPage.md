# Select

## Overview

A wrapper around the native `<select>` element with ARIA label/description linking and data-attribute hooks. Select is a stateless render helper: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. For a custom dropdown with keyboard navigation and custom rendering, use Listbox or Combobox instead.

:::Info{label="See it in an app"}
Check out how Select is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/select.ts).
:::

## Examples

### Basic

Pass an `onChange` handler that receives the selected option’s value as a string. You provide the `<option>` elements inside the `<select>` in your `toView` callback.

::Demo{name="basic"}

::Snippet{name="uiSelectBasic" label="basic select example"}

### Disabled

Set `isDisabled: true` to disable the select.

::Demo{name="disabled"}

::Snippet{name="uiSelectDisabled" label="disabled select example"}

## Styling

Select is headless. Your `toView` callback controls all markup and styling. The native `<select>` dropdown appearance varies by browser and OS. Use `appearance-none` in CSS and add a custom chevron icon for a consistent look.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-disabled` | Present when isDisabled is true. |
| `data-invalid`  | Present when isInvalid is true.  |

## Keyboard Interaction

Select uses the native `<select>` element, so keyboard interaction is handled by the browser.

| Key             | Description                |
| --------------- | -------------------------- |
| `Space`         | Opens the native dropdown. |
| `Enter`         | Opens the native dropdown. |
| `Arrow Up/Down` | Navigates between options. |

## Accessibility

Select provides the same ARIA wiring as Input. The `label` group links via `for`, and the `description` group is referenced by `aria-describedby`. You can access the description ID directly with `Select.descriptionId(id)`.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Select.view()`.

| Name          | Type                                     | Default | Description                                                                                                 |
| ------------- | ---------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `id`          | `string`                                 | —       | Unique ID for the select element. Used to link the label and description via ARIA attributes.               |
| `toView`      | `(attributes: SelectAttributes) => Html` | —       | Callback that receives attribute groups for the select, label, and description elements.                    |
| `onChange`    | `(value: string) => Message`             | —       | Function that maps the selected value to a Message when the selection changes.                              |
| `value`       | `string`                                 | —       | The currently selected value.                                                                               |
| `isDisabled`  | `boolean`                                | `false` | Whether the select is disabled. Sets the native disabled attribute.                                         |
| `isInvalid`   | `boolean`                                | `false` | Whether the select is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling. |
| `isAutofocus` | `boolean`                                | `false` | Whether the select receives focus when the page loads.                                                      |
| `name`        | `string`                                 | —       | The form field name for native form submission.                                                             |

### SelectAttributes {#select-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                        |
| ------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `select`      | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<select>` element. Includes id, value, ARIA attributes, and event handlers.       |
| `label`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<label>` element. Includes a for attribute linking to the select id.              |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id that the select references via aria-describedby. |
