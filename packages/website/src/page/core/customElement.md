# CustomElement

## Overview

Native web components are browser elements with hyphenated tags, JavaScript properties, and `CustomEvent`s. They can render into a shadow DOM and own their internal keyboard, pointer, and display behavior.

`CustomElement.define` gives that declarative interface a typed Foldkit binding. Properties become PascalCase factories on an element builder, events become `On{PascalCase}` factories, and the builder renders beside standard elements such as `h.div` and `h.button`. Properties flow from the Model into the element; event details return as Messages.

:::Info{label="A declarative boundary"}
The browser owns the custom element's implementation. Foldkit owns the typed property and event wiring. The view remains a pure function from Model to VNode, with no manual property assignment or separate Mount.
:::

## Defining a Binding

Foldkit defines the typed binding, but the browser still needs the element's class. Third-party packages commonly register it through a side-effect import. For example: importing `vanilla-colorful/hex-color-picker.js` calls `customElements.define` for `<hex-color-picker>`. A custom element you author follows the same browser registration step.

`CustomElement.define` takes one config object with the element's `tag`, a record of JavaScript `properties`, and a record of custom `events`. Each property and event payload is described with Schema. The resulting spec is independent of any application Message type, so it can be exported and shared.

Inside a view, call `.withMessage(h)` on the spec. The view builder acts as a type witness that binds event handlers to the current Message universe. The runtime builder is reusable after that binding.

::Snippet{name="customElementDefine" label="CustomElement.define example"}

The bound element builder is callable. Pass attributes, including generated property and event factories, as the first argument and children as the second. Either argument can be omitted when it is not needed. Schema keeps both directions typed: a property factory accepts its declared value, while an event factory receives its declared `detail` and returns a Message.

## Properties and Events

Each property name becomes a PascalCase factory. For example: `value` becomes `Value`, and `isDisabled` becomes `IsDisabled`. The factory writes a JavaScript property on the live element through `propsModule`, not an HTML attribute. This allows values such as arrays and objects, and Foldkit only writes a property again when its value changes across renders. When primitive properties are removed, booleans reset to `false`, strings to `''`, and numbers to `0`.

Each kebab-case event name becomes an `On{PascalCase}` factory. For example: `color-changed` becomes `OnColorChanged`. Its callback receives the decoded `detail` from a `CustomEvent` and returns the Message Foldkit dispatches.

Foldkit decodes each event's `detail` against its declared Schema before calling the event factory callback. Invalid details are reported to the console and produce no Message. Schema transformations run at this boundary, and undeclared fields are removed according to the Schema's decoding behavior.

For an event with no payload, declare `Schema.Struct({})`. Browsers set `detail` to `null` when a `CustomEvent` is constructed without one. Foldkit first decodes that raw value so Schemas such as `Schema.Null` preserve their meaning; when the Schema rejects a nullish detail, Foldkit retries with an empty object so the payload-less struct decodes.

:::Info{label="Validation runs at define time"}
`CustomElement.define` validates the custom tag, property names, and event names when the binding is created. It also rejects generated factory-name collisions. For example: an `onClick` property and a `click` event would both produce `OnClick`, so the definition throws before the view can render it.
:::

## When to Reach for CustomElement

Use CustomElement when the foreign element exposes a declarative contract: JavaScript properties go in and `CustomEvent`s come out. The element owns its rendering and internal state, while the application shares state through the Model. Most web component libraries built with tools such as Lit or Stencil fit this shape.

Use [Mount](/core/mount) when the foreign API is imperative. Instantiating a map in a container, calling methods on an editor, or pairing setup with a destructor requires the live `Element` and an element-scoped Effect. The [Map example](/example-apps/map) shows that lifecycle.

The [Web Components example](/example-apps/web-components) shows the declarative alternative. A `<hex-color-picker>` emits color changes as Messages, while `<sl-qr-code>` receives typed properties diffed from the Model. The elements never coordinate directly; update connects them through application state.
