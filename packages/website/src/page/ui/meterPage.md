# Meter

## Overview

Meter displays a scalar quantity within a known range, such as remaining storage, battery charge, or a health level. It is a stateless controlled view: your Model owns the value, and Meter provides the ARIA and styling attributes. Use Progress instead when the value represents completion of a task.

:::Info{label="See it in an app"}
Check out how Meter is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/meter.ts).
:::

## Examples

### Basic

Pass the current `value` and render the provided attribute groups. Spread `attributes.label` onto the visible label, `attributes.meter` onto the element that carries the meter role, and `attributes.fill` onto the filled portion. The fill width reflects the value's position within the range.

::Demo{name="basic"}

::Snippet{name="uiMeterBasic" label="Meter"}

### Thresholds

`low`, `high`, and `optimum` expose application-specific thresholds as `data-low`, `data-high`, and `data-optimum`. They do not change the Meter's ARIA attributes; use them to style the ranges your application considers low, high, or optimal.

::Demo{name="thresholds"}

## Styling

Meter is headless. Your `toView` callback controls its markup and styling.

| Attribute      | Condition                                                  |
| -------------- | ---------------------------------------------------------- |
| `data-value`   | Present on `meter` and `fill` with the clamped value.      |
| `data-min`     | Present on `meter` and `fill` with the normalized minimum. |
| `data-max`     | Present on `meter` and `fill` with the normalized maximum. |
| `data-low`     | Present on `meter` when `low` is set.                      |
| `data-high`    | Present on `meter` when `high` is set.                     |
| `data-optimum` | Present on `meter` when `optimum` is set.                  |

The `fill` attribute group carries an inline `width` matching the value's position within the normalized range. Meter intentionally has no `loading` or `complete` state because it describes a measurement, not task progress.

## Accessibility

The meter element receives `role="meter"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`. By default, it is named through `aria-labelledby`, which points to the id carried by the `label` attribute group. Use `ariaLabel` when there is no visible label, or `ariaLabelledBy` to reference a different labeling element. When both overrides are provided, `ariaLabel` takes precedence.

Use `valueText` when the number needs a natural-language equivalent. It accepts either a string or a `(value, max) => string` formatter and sets `aria-valuetext` from the clamped value.

Meter clamps `value` into `[min, max]`. If `max` is lower than `min`, it is normalized to `min` before any ARIA or data attributes are emitted, so the rendered range remains valid.

Meter is read-only and has no keyboard interaction.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Meter.view()`.

| Name             | Type                                                 | Default | Description                                                               |
| ---------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `id`             | `string`                                             | —       | Unique id for the Meter and its generated label id.                       |
| `value`          | `number`                                             | —       | Current scalar value. Clamped into the normalized range.                  |
| `min`            | `number`                                             | `0`     | Lower bound of the range.                                                 |
| `max`            | `number`                                             | `100`   | Upper bound of the range. Normalized to at least `min`.                   |
| `low`            | `number`                                             | —       | Value exposed as `data-low` for consumer styling.                         |
| `high`           | `number`                                             | —       | Value exposed as `data-high` for consumer styling.                        |
| `optimum`        | `number`                                             | —       | Value exposed as `data-optimum` for consumer styling.                     |
| `valueText`      | `string \| ((value: number, max: number) => string)` | —       | Natural-language value exposed through `aria-valuetext`.                  |
| `ariaLabel`      | `string`                                             | —       | Accessible name used instead of the rendered label.                       |
| `ariaLabelledBy` | `string`                                             | —       | Id of a different element that labels the Meter.                          |
| `toView`         | `(attributes: MeterAttributes) => Html`              | —       | Renders the Meter from the `meter`, `fill`, and `label` attribute groups. |

### MeterAttributes {#meter-attributes}

Attribute groups provided to the `toView` callback.

| Name    | Type                                | Default | Description                                                                                     |
| ------- | ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `meter` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the element carrying the meter role, ARIA value attributes, and data attributes.    |
| `fill`  | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the filled portion. Includes the calculated inline width and range data attributes. |
| `label` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the visible label. Includes the id referenced by `aria-labelledby` by default.      |
