# Fieldset

## Overview

A semantic form section that groups related controls with a legend and description. Fieldset is a stateless render helper that wraps the native `<fieldset>` element: call it directly with a ViewConfig in your own view; no Model, update, or `h.submodel` wrapping. When disabled, the browser propagates the disabled state to all child form controls automatically.

:::Info{label="See it in an app"}
Check out how Fieldset is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/fieldset.ts).
:::

## Examples

### Basic

The `toView` callback receives three attribute groups: `fieldset` for the wrapper, `legend` for the group title, and `description` for help text. Nest other Foldkit UI components inside the fieldset body.

::Demo{name="basic"}

::Snippet{name="uiFieldsetBasic" label="basic fieldset example"}

### Disabled

Set `isDisabled: true` to disable the entire group. The native `<fieldset disabled>` attribute propagates to all child inputs, textareas, buttons, and selects. You don’t need to disable each control individually.

::Demo{name="disabled"}

::Snippet{name="uiFieldsetDisabled" label="disabled fieldset example"}

## Styling

Fieldset is headless. Your `toView` callback controls all markup and styling.

| Attribute       | Condition                        |
| --------------- | -------------------------------- |
| `data-disabled` | Present when isDisabled is true. |

## Accessibility

The `legend` attribute group includes an id (accessible via `Fieldset.legendId(id)`) and the `description` group includes an id (accessible via `Fieldset.descriptionId(id)`) that the fieldset references through `aria-describedby`.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Fieldset.view()`.

| Name         | Type                                       | Default | Description                                                                                                            |
| ------------ | ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`                                   | —       | Unique ID for the fieldset element. Used to generate linked IDs for legend and description.                            |
| `toView`     | `(attributes: FieldsetAttributes) => Html` | —       | Callback that receives attribute groups for the fieldset, legend, and description elements.                            |
| `isDisabled` | `boolean`                                  | `false` | Whether the fieldset is disabled. The native disabled attribute on `<fieldset>` propagates to all child form controls. |

### FieldsetAttributes {#fieldset-attributes}

Attribute groups provided to the `toView` callback.

| Name          | Type                                | Default | Description                                                                                                      |
| ------------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| `fieldset`    | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<fieldset>` element. Includes id, aria-describedby, and the disabled attribute when applicable. |
| `legend`      | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<legend>` element. Includes an id for programmatic reference.                                   |
| `description` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a description element. Includes an id that the fieldset references via aria-describedby.             |
