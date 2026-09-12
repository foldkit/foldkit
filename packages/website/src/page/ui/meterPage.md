# Meter

## Overview

A scalar value within a known range, such as health, storage used, or battery level. Meter is a stateless controlled render helper. Your Model owns the numeric value. Meter clamps it into `[min, max]` and provides the `role="meter"` and value attributes. For task completion with an unknown duration, use Progress instead.

:::Info{label="See it in an app"}
Check out how Meter could replace a hand-rolled meter in a [Foldkit app](https://github.com/foldkit/foldkit/issues/888).
:::

## Examples

### Basic

Pass `value`, `max`, and an accessible name. Spread `attributes.meter` onto the track and `attributes.fill` onto the inner bar. The fill width reflects the current value as a percentage of the range.

::Demo{name="basic"}

::Snippet{name="uiMeterBasic" label="meter example"}

### Thresholds

`low`, `high`, and `optimum` mark ideal and warning zones. They appear as `data-low`, `data-high`, and `data-optimum` on the meter element for styling.

::Demo{name="thresholds"}

## Styling

Meter is headless. Your `toView` callback controls all markup and styling. Use the data attributes below to style the track and fill.

| Attribute      | Condition                                               |
| -------------- | ------------------------------------------------------- |
| `data-value`   | Present on meter and fill as the clamped value.         |
| `data-min`     | Present on meter as the minimum value.                  |
| `data-max`     | Present on meter and fill as the maximum value.         |
| `data-state`   | `complete` when value reaches max, otherwise `loading`. |
| `data-low`     | Present when `low` is set.                              |
| `data-high`    | Present when `high` is set.                             |
| `data-optimum` | Present when `optimum` is set.                          |

The `fill` attribute group carries an inline `width` so the filled portion matches the current value.

## Accessibility

The meter element receives `role="meter"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and an accessible name via `aria-label` or `aria-labelledby`. When `valueText` is provided, it is announced via `aria-valuetext` and should read as natural language such as `75 of 100 health`. `valueText` accepts a `string` or a `(value, max) => string` function.

At least one of `ariaLabel` and `ariaLabelledBy` is required by the type. If neither is provided at runtime, Meter falls back to `aria-labelledby` pointing at the id carried on the `label` attribute group. The `label` group is reachable via `Meter.labelId(id)`.

Meter values are clamped into `[min, max]` before `aria-valuenow` is set. This prevents a screen reader from announcing a value outside the declared range.

Meter is not interactive and has no keyboard interaction.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Meter.view()`.

| Name             | Type                                                 | Default | Description                                                                                     |
| ---------------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `id`             | `string`                                             | —       | Unique ID for the meter instance. Used to link the label via ARIA.                              |
| `value`          | `number`                                             | —       | Current scalar value. Clamped into `[min, max]` for `aria-valuenow` and the fill width.         |
| `min`            | `number`                                             | `0`     | Lower bound of the range.                                                                       |
| `max`            | `number`                                             | `100`   | Upper bound of the range.                                                                       |
| `low`            | `number`                                             | —       | Threshold below which the value is considered low. Exposed as `data-low` for styling.           |
| `high`           | `number`                                             | —       | Threshold above which the value is considered high. Exposed as `data-high` for styling.         |
| `optimum`        | `number`                                             | —       | Optimal value in the range. Exposed as `data-optimum` for styling.                              |
| `valueText`      | `string \| ((value: number, max: number) => string)` | —       | Human readable text for `aria-valuetext`. Use it when the numeric value needs natural language. |
| `ariaLabel`      | `string`                                             | —       | Accessible name. At least one of `ariaLabel` and `ariaLabelledBy` is required.                  |
| `ariaLabelledBy` | `string`                                             | —       | ID of an external element whose text serves as the meter accessible name.                       |
| `toView`         | `(attributes: MeterAttributes) => Html`              | —       | Callback that receives attribute groups for the meter, fill, and label elements.                |

### MeterAttributes {#meter-attributes}

Attribute groups provided to the `toView` callback.

| Name    | Type                                | Default | Description                                                                                        |
| ------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `meter` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the meter container. Includes `role="meter"`, aria value attributes, and data markers. |
| `fill`  | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the inner bar. Its inline width reflects the current value as a percentage.            |
| `label` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the visible label element. Includes the id that `aria-labelledby` can reference.       |
