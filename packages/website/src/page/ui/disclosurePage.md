# Disclosure

## Overview

A toggle for showing and hiding content inline. Disclosure is a stateless controlled render helper. Call it directly with a ViewConfig in your own view, with no Model, update, or `h.submodel` wrapping of its own. Your Model owns the value passed as `isOpen`, and `onToggle` turns an interaction into a Message for update to store. Use it for FAQs, accordions, and collapsible sections. For content in a floating panel, use Dialog or Popover instead.

:::Info{label="See it in an app"}
Check out how Disclosure is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/disclosure.ts).
:::

## Examples

### Basic

Provide a `toView` callback that receives the `button` and `panel` attribute bundles. Spread them onto your own elements; Disclosure manages the ARIA linking and toggle behavior.

::Demo{name="basic"}

::Snippet{name="uiDisclosureBasic" label="disclosure example"}

The example renders the panel unconditionally and passes it through `animatePanel`, which wraps the content in a CSS-grid container that transitions its height, keeping the panel mounted while collapsed so there is something to animate. To skip the animation, render the panel only while `isOpen`.

### Collapsed preview

A collapsed preview keeps some of its panel visually on screen while closed. Pass `peek` with the height of that preview. The panel clips everything past the preview until it opens, and the transition starts at the preview height instead of zero.

::Demo{name="collapsedPreview"}

::Snippet{name="uiDisclosureCollapsedPreview" label="collapsed preview example"}

The preview is visual only. While the disclosure is closed, `animatePanel` marks the whole panel inert and hides it from assistive technology. Links, buttons, and other controls inside the panel cannot receive focus or interaction until it opens. Keep controls that must remain available, such as a code block's copy button, outside the panel.

Choose a CSS height that follows the content's typography. The example uses `6rem`; an `em` value follows the panel's own font size.

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

An animated panel stays mounted so its height can transition. While the disclosure is closed, `animatePanel` makes that mounted content inert and hides it from assistive technology. With `peek`, sighted users see a visual preview, while other users encounter the collapsed trigger and receive the complete panel after opening it.

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

| Name           | Type                                                     | Default | Description                                                                                                                                                                                                                                                                                               |
| -------------- | -------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button`       | `ReadonlyArray<Attribute<Message>>`                      | —       | Spread onto the toggle button element. Includes `aria-expanded`, `aria-controls`, `tabindex`, the click + Enter/Space keyboard handlers, and `type="button"` so a trigger inside a form does not submit it.                                                                                               |
| `panel`        | `ReadonlyArray<Attribute<Message>>`                      | —       | Spread onto the panel element. Includes the panel id (`${id}-panel`) and a `data-open` attribute when open.                                                                                                                                                                                               |
| `animatePanel` | `(content: Html, options?: AnimatePanelOptions) => Html` | —       | Wraps panel content in a CSS-grid container that animates height as the disclosure opens and closes. Render the panel unconditionally and pass it here. While collapsed, the mounted content is inert and hidden from assistive technology. With `peek`, the panel keeps that height as a visual preview. |

### AnimatePanelOptions {#animate-panel-options}

Options for `animatePanel`.

| Name   | Type     | Default | Description                                                                                                                                                                                |
| ------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `peek` | `string` | —       | A CSS height the collapsed panel keeps as an inert visual preview. Content past that height is clipped, and the entire panel becomes accessible and interactive when the disclosure opens. |
