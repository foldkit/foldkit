# Button

## Overview

A thin wrapper around the native button element that provides consistent accessibility attributes and data-attribute hooks for styling. Button is a stateless render helper: call it directly with a ViewConfig in your own view. No Model, Messages, update, or `h.submodel` wrapping.

:::Info{label="See it in an app"}
Check out how Button is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/button.ts).
:::

## Examples

### Basic

Pass an `onClick` Message and a `toView` callback that spreads the provided attributes onto a `<button>` element.

::Demo{name="basic"}

::Snippet{name="uiButtonBasic" label="basic button example"}

### Disabled

Set `isDisabled: true` to disable the button. Foldkit uses `aria-disabled` instead of the native `disabled` attribute so the button remains focusable for screen readers.

::Demo{name="disabled"}

::Snippet{name="uiButtonDisabled" label="disabled button example"}

## Styling

Button is headless. It provides no default styles. Your `toView` callback receives attribute groups to spread onto the element, and you control all markup and styling.

Use the following data attributes to style different states:

| Attribute       | Condition                          |
| --------------- | ---------------------------------- |
| `data-disabled` | Present when `isDisabled` is true. |

## Keyboard Interaction

Button uses the native `<button>` element, so keyboard interaction is handled by the browser.

| Key     | Description           |
| ------- | --------------------- |
| `Enter` | Activates the button. |
| `Space` | Activates the button. |

## Accessibility

Button sets `aria-disabled="true"` when disabled instead of the native `disabled` attribute. This ensures the button remains in the tab order and is announced by screen readers, while preventing click handlers from firing.

`tabindex="0"` is always set to ensure focusability. The `type` attribute defaults to `"button"` to prevent accidental form submissions.

Add your own attributes after the `button` bundle. A later attribute wins, so `h.Type('submit')` after the bundle replaces the default. A button that changes its own text, such as one cycling through values on a tap, announces each change by carrying a live region: spread `h.AriaLive('polite')` and `h.AriaAtomic(true)` after the bundle. Button adds no ARIA beyond what it manages, so this is the intended way.

```ts
h.button([...button, h.AriaLive("polite"), h.AriaAtomic(true)], [label]);
```

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Button.view()`.

| Name          | Type                                     | Default    | Description                                                                                                        |
| ------------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `toView`      | `(attributes: ButtonAttributes) => Html` | —          | Callback that receives attribute groups and returns the button markup.                                             |
| `onClick`     | `Message`                                | —          | Message to dispatch when the button is clicked.                                                                    |
| `isDisabled`  | `boolean`                                | `false`    | Whether the button is disabled. Uses `aria-disabled` instead of the `disabled` attribute to preserve focusability. |
| `type`        | `'button' \| 'submit' \| 'reset'`        | `'button'` | The HTML button type attribute.                                                                                    |
| `isAutofocus` | `boolean`                                | `false`    | Whether the button receives focus when the page loads.                                                             |

### ButtonAttributes {#button-attributes}

Attribute groups provided to the `toView` callback.

| Name     | Type                                | Default | Description                                                                                       |
| -------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `button` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the `<button>` element. Includes type, tabindex, ARIA attributes, and event handlers. |
