# Progress

## Overview

Progress reports completion of a task, such as uploading a file or loading a page. It is a stateless controlled view: your Model owns a determinate value when one is known, while omitting `value` renders indeterminate progress. Use Meter instead for a scalar measurement that is not task completion.

:::Info{label="See it in an app"}
Check out how Progress is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/progress.ts).
:::

## Examples

### Determinate

Pass `value` when the amount completed is known. Spread `attributes.label` onto the visible label, `attributes.progress` onto the element that carries the progressbar role, and `attributes.indicator` onto the filled portion. The indicator width reflects the value's position within the range.

::Demo{name="basic"}

::Snippet{name="uiProgressBasic" label="Progress"}

### Indeterminate

Omit `value` when progress cannot yet be quantified. The progressbar then omits `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`. The `progress`, `track`, and `indicator` groups receive `data-state="indeterminate"` and `data-indeterminate` so the consumer can provide an appropriate animation.

::Demo{name="indeterminate"}

::Snippet{name="uiProgressIndeterminate" label="Indeterminate progress"}

## Styling

Progress is headless. Your `toView` callback controls its markup and styling.

| Attribute            | Condition                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `data-value`         | Present on `progress` and `indicator` with the clamped determinate value.                   |
| `data-min`           | Present on `progress` and `indicator` with the normalized minimum.                          |
| `data-max`           | Present on `progress` and `indicator` with the normalized maximum.                          |
| `data-state`         | Present on `progress`, `track`, and `indicator`: `loading`, `complete`, or `indeterminate`. |
| `data-indeterminate` | Present on `progress`, `track`, and `indicator` when value is omitted.                      |

For determinate progress, `indicator` carries an inline `width` matching the value's position within the normalized range. Indeterminate progress leaves the width entirely to consumer styling.

## Accessibility

The progressbar receives `role="progressbar"` and an accessible name. By default, it is named through `aria-labelledby`, which points to the id carried by the `label` attribute group. Use `ariaLabel` when there is no visible label, or `ariaLabelledBy` to reference a different labeling element. When both overrides are provided, `ariaLabel` takes precedence.

Determinate progress receives `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`. The value is clamped into `[min, max]`; if `max` is lower than `min`, it is normalized to `min` before the attributes are emitted. Indeterminate progress omits all three numeric ARIA attributes to communicate that its current value is unknown.

`valueText` accepts either a string or a `(value, max) => string` formatter. Strings work for both states. The formatter is evaluated only for determinate progress, because indeterminate progress has no numeric value to format.

Progress is read-only and has no keyboard interaction.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Progress.view()`.

| Name             | Type                                                 | Default | Description                                                                               |
| ---------------- | ---------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `id`             | `string`                                             | —       | Unique id for Progress and its generated label id.                                        |
| `value`          | `number \| undefined`                                | —       | Current task progress. Omit it to render indeterminate progress.                          |
| `min`            | `number`                                             | `0`     | Lower bound of determinate progress.                                                      |
| `max`            | `number`                                             | `100`   | Upper bound of determinate progress. Normalized to at least `min`.                        |
| `valueText`      | `string \| ((value: number, max: number) => string)` | —       | Natural-language value; formatters run only for determinate progress.                     |
| `ariaLabel`      | `string`                                             | —       | Accessible name used instead of the rendered label.                                       |
| `ariaLabelledBy` | `string`                                             | —       | Id of a different element that labels Progress.                                           |
| `toView`         | `(attributes: ProgressAttributes) => Html`           | —       | Renders Progress from the `progress`, `track`, `indicator`, and `label` attribute groups. |

### ProgressAttributes {#progress-attributes}

Attribute groups provided to the `toView` callback.

| Name        | Type                                | Default | Description                                                                                                |
| ----------- | ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `progress`  | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the element carrying the progressbar role, accessible name, and state attributes.              |
| `track`     | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto an optional track element. Includes the current state attributes.                              |
| `indicator` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the moving or filled indicator. Includes state and determinate range attributes when relevant. |
| `label`     | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the visible label. Includes the id referenced by `aria-labelledby` by default.                 |
