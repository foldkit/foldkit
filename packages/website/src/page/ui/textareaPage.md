# Textarea

## Overview

An accessible multi-line text input that links a label and description via ARIA attributes. Textarea is a stateless render helper: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. It exposes the same three attribute groups as Input (`textarea`, `label`, and `description`) plus a `rows` prop to control the visible height.

:::Info{label="See it in an app"}
Check out how Textarea is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/textarea.ts).
:::

## Examples

### Basic

The `toView` callback receives attribute groups for the label, description, and textarea element. Spread `attributes.textarea` onto a `<textarea>` in your layout to wire up ARIA, focus, and change handling.

::Demo{name="basic"}

::Snippet{name="uiTextareaBasic" label="basic textarea example"}

### Disabled

Set `isDisabled: true` to disable the textarea. Like Input, this sets the native `disabled` attribute.

::Demo{name="disabled"}

::Snippet{name="uiTextareaDisabled" label="disabled textarea example"}

## Styling

Textarea is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style disabled, read-only, and invalid states.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-disabled` | Present when isDisabled is true. |
| `data-readonly` | Present when isReadOnly is true. |
| `data-invalid`  | Present when isInvalid is true.  |

## Keyboard Interaction

Textarea uses the native `<textarea>` element, so all keyboard interaction is handled by the browser.

| Key   | Description                               |
| ----- | ----------------------------------------- |
| `Tab` | Moves focus to or away from the textarea. |

A read-only textarea still takes focus and allows selection and copying. Typing does not change the value.

## Accessibility

Textarea provides the same ARIA wiring as Input. The `label` group links via `for`, and the `description` group is referenced by `aria-describedby` on the textarea. You can access the description ID directly with `Textarea.descriptionId(id)`.

When `isInvalid` is true, `aria-invalid="true"` is set on the textarea element.

`isReadOnly` sets the native `readonly` attribute, so the browser exposes the read-only state to assistive technology without any extra ARIA. The value stays focusable, selectable, and copyable, and the field is still submitted with its form.

`isDisabled` sets the native `disabled` attribute instead. A disabled textarea is not focusable and is left out of form submission. Use `isReadOnly` when the value still matters to the user and only editing is blocked, and `isDisabled` when the field is unavailable.

The two flags are independent. Setting both emits both attribute sets, and either one on its own removes the input handler. Browsers give `disabled` precedence when both are present.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Textarea.view()`.

| Name          | Type                                       | Default | Description                                                                                                                                                        |
| ------------- | ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | `string`                                   | —       | Unique ID for the textarea element. Used to link the label and description via ARIA attributes.                                                                    |
| `toView`      | `(attributes: TextareaAttributes) => Html` | —       | Callback that receives attribute groups for the textarea, label, and description elements.                                                                         |
| `onInput`     | `(value: string) => Message`               | —       | Function that maps the current textarea value to a Message on each input event.                                                                                    |
| `value`       | `string`                                   | —       | The current value of the textarea.                                                                                                                                 |
| `isDisabled`  | `boolean`                                  | `false` | Whether the textarea is disabled. Sets the native disabled attribute.                                                                                              |
| `isReadOnly`  | `boolean`                                  | `false` | Whether the textarea is readable but not editable. Sets the native readonly attribute and adds a data-readonly attribute for styling. Independent of `isDisabled`. |
| `isInvalid`   | `boolean`                                  | `false` | Whether the textarea is in an invalid state. Sets aria-invalid and adds a data-invalid attribute for styling.                                                      |
| `isAutofocus` | `boolean`                                  | `false` | Whether the textarea receives focus when the page loads.                                                                                                           |
| `name`        | `string`                                   | —       | The form field name for native form submission.                                                                                                                    |
| `rows`        | `number`                                   | —       | The visible number of text lines.                                                                                                                                  |
| `placeholder` | `string`                                   | —       | Placeholder text shown when the textarea is empty.                                                                                                                 |

### TextareaAttributes {#textarea-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                        | Default | Description                                                                                          |
| ------------- | ------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `textarea`    | `ReadonlyArray<TextareaAttribute<Message>>` | —       | Spread onto the `<textarea>` element. Includes id, rows, value, ARIA attributes, and event handlers. |
| `label`       | `ReadonlyArray<Attribute<Message>>`         | —       | Spread onto the `<label>` element. Includes a for attribute linking to the textarea id.              |
| `description` | `ReadonlyArray<Attribute<Message>>`         | —       | Spread onto a description element. Includes an id that the textarea references via aria-describedby. |
