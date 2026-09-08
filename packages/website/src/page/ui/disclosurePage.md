# Disclosure

## Overview

A toggle for showing and hiding content inline. Disclosure is a stateless controlled render helper. Call it directly with a ViewConfig in your own view, with no Model, update, or `h.submodel` wrapping of its own. Your Model owns the value passed as `isOpen`, and `onToggle` turns an interaction into a Message for update to store. Use it for FAQs, accordions, and collapsible sections. For content in a floating panel, use Dialog or Popover instead.

:::Info{label="See it in an app"}
Check out how Disclosure is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/disclosure.ts).
:::

## Examples

Provide a `toView` callback that receives the `button` and `panel` attribute bundles. Spread them onto your own elements; Disclosure manages the ARIA linking and toggle behavior.

::Demo{name="basic"}

::Snippet{name="uiDisclosureBasic" label="disclosure example"}

The example renders the panel unconditionally and passes it through `animatePanel`, which wraps the content in a CSS-grid container that transitions its height, keeping the panel mounted while collapsed so there is something to animate. To skip the animation, render the panel only while `isOpen`.

## Styling

Use the `data-open` attribute to style the button and panel differently when open.

| Attribute       | Condition                                                     |
| --------------- | ------------------------------------------------------------- |
| `data-open`     | Present on both button and panel when the disclosure is open. |
| `data-disabled` | Present on the button when isDisabled is true.                |

## Keyboard Interaction

| Key     | Description             |
| ------- | ----------------------- |
| `Enter` | Toggles the disclosure. |
| `Space` | Toggles the disclosure. |

## Accessibility

The toggle button receives `aria-expanded` and `aria-controls` linking to the panel. Toggling is user-driven, so focus stays on the button the user activated; there is no focus Command to handle in update.

Give the toggle an accessible name when its content is not self-describing. For a visible label, wire a native `<label for>` that targets the toggle id with `Disclosure.buttonId(id)` rather than hardcoding the `-button` convention. The `for` association makes the toggle properly labeled: assistive technology announces it by the visible label text, and clicking the label opens the disclosure. That is why it is the recommended pattern.

Two ViewConfig fields cover the cases a `<label for>` does not. Pass `ariaLabel` for an icon-only toggle with no visible label, or `ariaLabelledBy` when the element that names the toggle is not a `<label>` you can point `for` at.

## API Reference

### ViewConfig {#view-config}

Configuration object passed to `Disclosure.view()`.

| Name             | Type                                         | Default | Description                                                                                                                                                                                       |
| ---------------- | -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | `string`                                     | —       | Unique ID for the disclosure instance. Used to derive the button and panel ids for ARIA linking.                                                                                                  |
| `isOpen`         | `boolean`                                    | —       | The current open state, read from your Model. `aria-expanded`, the `data-open` marker, and `animatePanel` derive from it.                                                                         |
| `onToggle`       | `(isOpen: boolean) => Message`               | —       | Maps the new open state to a Message when the user toggles the disclosure. Store that value in update.                                                                                            |
| `toView`         | `(attributes: DisclosureAttributes) => Html` | —       | Callback that receives the `button` and `panel` attribute bundles and returns the composed layout. The consumer reads `isOpen` from their own Model when they need to render conditionally on it. |
| `isDisabled`     | `boolean`                                    | `false` | When true, the button is not clickable, gets `aria-disabled` and a `data-disabled` attribute.                                                                                                     |
| `ariaLabel`      | `string`                                     | —       | Accessible name for the toggle button. Use for an icon-only trigger with no visible label. Applied as aria-label, and takes precedence over ariaLabelledBy.                                       |
| `ariaLabelledBy` | `string`                                     | —       | Id of an external element that labels the toggle button, applied as aria-labelledby. Pair with a visible label element.                                                                           |

### DisclosureAttributes {#disclosure-attributes}

Attribute bundles delivered to the `toView` callback each render.

| Name           | Type                                | Default | Description                                                                                                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `button`       | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the toggle button element. Includes `aria-expanded`, `aria-controls`, `tabindex`, the click + Enter/Space keyboard handlers, and `type="button"` so a trigger inside a form does not submit it.                                                                                                                    |
| `panel`        | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the panel element. Includes the panel id (`${id}-panel`) and a `data-open` attribute when open.                                                                                                                                                                                                                    |
| `animatePanel` | `(content: Html) => Html`           | —       | Wraps panel content in a CSS-grid container that animates height as the disclosure opens and closes. Render the panel unconditionally (rather than gating on isOpen) and pass it here; the panel stays mounted while collapsed so the height transition has something to animate. The collapsed content is marked aria-hidden. |
