# Progress

## Overview

Task completion with a known or unknown duration, such as file upload or loading. Progress is a stateless controlled render helper. Your Model owns the numeric value. Progress provides the `role="progressbar"` and value attributes and supports an indeterminate state when the duration is not known. For a scalar that stays in a known range such as health or storage, use Meter instead.

:::Info{label="See it in an app"}
Check out how Progress could replace a hand-rolled progress bar in a [Foldkit app](https://github.com/foldkit/foldkit/issues/888).
:::

## Examples

### Basic

Pass `value`, `max`, and an accessible name. Spread `attributes.progress` onto the track and `attributes.indicator` onto the inner bar. The indicator width reflects the current value as a percentage of the range.

::Demo{name="basic"}

::Snippet{name="uiProgressBasic" label="progress example"}

### Indeterminate

Omit `value` or pass `null` to render an indeterminate indicator. The progress element omits `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`, and exposes `data-state="indeterminate"` and `data-indeterminate` for animated skeletons.

::Demo{name="indeterminate"}

::Snippet{name="uiProgressIndeterminate" label="indeterminate progress example"}

## Styling

Progress is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style determinate and indeterminate states.

| Attribute            | Condition                                                                |
| -------------------- | ------------------------------------------------------------------------ |
| `data-value`         | Present on progress and indicator when determinate as the clamped value. |
| `data-max`           | Present on progress and indicator when determinate as the maximum value. |
| `data-state`         | `loading`, `complete`, or `indeterminate`.                               |
| `data-indeterminate` | Present when indeterminate.                                              |

When determinate, the `indicator` attribute group carries an inline `width` so the filled portion matches the current value. When indeterminate, no width is set so you can animate by other means.

## Accessibility

The progress element receives `role="progressbar"` and an accessible name via `aria-label` or `aria-labelledby`. When determinate it also receives `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`. When indeterminate those three attributes are omitted and a screen reader announces the element as busy. When `valueText` is provided, it is announced via `aria-valuetext` for both states and should read as natural language such as `42 percent` or `Loading`. `valueText` accepts a `string` or a `(value, max) => string` function.

At least one of `ariaLabel` and `ariaLabelledBy` is required by the type. If neither is provided at runtime, Progress falls back to `aria-labelledby` pointing at the id carried on the `label` attribute group. The `label` group is reachable via `Progress.labelId(id)`.

Determinate values are clamped into `[min, max]` before `aria-valuenow` is set. This prevents a screen reader from announcing a value outside the declared range.

Progress is not interactive and has no keyboard interaction.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Progress.view()`.

| Name             | Type                                                 | Default | Description                                                                                     |
| ---------------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `id`             | `string`                                             | —       | Unique ID for the progress instance. Used to link the label via ARIA.                           |
| `value`          | `number \| null \| undefined`                        | —       | Current value. `null` or `undefined` renders indeterminate state with no `aria-valuenow`.       |
| `min`            | `number`                                             | `0`     | Lower bound of the range. Only emitted when determinate.                                        |
| `max`            | `number`                                             | `100`   | Upper bound of the range. Only emitted when determinate.                                        |
| `valueText`      | `string \| ((value: number, max: number) => string)` | —       | Human readable text for `aria-valuetext`. Use it when the numeric value needs natural language. |
| `ariaLabel`      | `string`                                             | —       | Accessible name. At least one of `ariaLabel` and `ariaLabelledBy` is required.                  |
| `ariaLabelledBy` | `string`                                             | —       | ID of an external element whose text serves as the progress accessible name.                    |
| `toView`         | `(attributes: ProgressAttributes) => Html`           | —       | Callback that receives attribute groups for the progress, track, indicator, and label elements. |

### ProgressAttributes {#progress-attributes}

Attribute groups provided to the `toView` callback.

| Name        | Type                                | Default | Description                                                                                                                  |
| ----------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `progress`  | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the progress container. Includes `role="progressbar"`, aria value attributes when determinate, and data markers. |
| `track`     | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the track element used as positioning context. Includes `data-state`.                                            |
| `indicator` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the inner bar. Its inline width reflects the current value when determinate.                                     |
| `label`     | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the visible label element. Includes the id that `aria-labelledby` can reference.                                 |
