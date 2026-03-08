# Web Component Interop

Foldkit should be a good citizen of the web component ecosystem — both as a **consumer** of custom elements and as a **producer** (wrapping Foldkit apps as custom elements for embedding).

## Why This Matters for Adoption

- Web components are the browser-native interop layer. Supporting them lets Foldkit apps use rich third-party widgets (maps, editors, date pickers) without framework-specific wrappers.
- Wrapping Foldkit apps as custom elements makes them embeddable in any context — React, Vue, vanilla HTML, CMS pages — lowering the barrier for incremental adoption.
- Libraries like Shoelace, Lit, and Adobe Spectrum ship as web components. Foldkit users should be able to reach for these without friction.

## Direction 1: Consuming Web Components in Foldkit Views

### Properties vs. Attributes

Web components accept rich data (objects, arrays) via JavaScript properties, but Foldkit's vdom currently works with string attributes. We need a way to set properties on custom elements.

**Options:**

- A `prop` helper distinct from `attr` — e.g. `prop('markers', markerArray)` sets the JS property, not the HTML attribute
- A naming convention (e.g. attributes starting with `.` are treated as properties, following Lit's template syntax)
- Automatic detection: if the value isn't a string, set it as a property

### Custom Events to Messages

Custom elements emit `CustomEvent` with data on `.detail`. This maps cleanly to the existing `on` handler pattern:

```ts
on('date-change', event => SelectedDate({ value: event.detail.date }))
```

No new infrastructure needed — just documentation showing the pattern and ensuring `on` handlers receive the full `CustomEvent` (not just a subset of fields).

### Lifecycle and State Ownership

Web components hold internal state (Shadow DOM contents, internal properties). This is a pragmatic exception to "model as single source of truth" — the same kind of exception we already make for browser-owned state like scroll position and focus.

**Guidelines for consumers:**

- Treat web components as opaque leaf nodes — Foldkit renders them but doesn't diff into the shadow DOM
- Always `keyed` web component instances so the vdom doesn't destroy/recreate them during diffs
- Use Commands for imperative method calls on custom elements (e.g. `editor.reset()`)
- Map outgoing events to Messages; pass data in via properties

### Shadow DOM and Styling

- CSS custom properties cross the shadow boundary — Foldkit's Tailwind theme tokens (via `@theme`) would be available inside web components that use custom properties
- `::part()` selectors let consumers style named parts of a web component — document how this works with Tailwind

## Direction 2: Wrapping Foldkit Apps as Custom Elements

Package a Foldkit app inside a custom element for embedding:

```ts
class MyWidget extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' })
    Foldkit.mount({ root: shadow, init, update, view })
  }
  disconnectedCallback() {
    // teardown: cancel subscriptions, clean up runtime
  }
}
customElements.define('my-widget', MyWidget)
```

### Open Questions

- **Attributes as external input:** How do observed attributes map to Messages? `attributeChangedCallback` could dispatch a message like `ChangedAttribute({ name, value })`, but a more typed approach would be better.
- **Runtime teardown:** `Foldkit.mount` would need to return a cleanup handle so `disconnectedCallback` can stop the runtime, cancel subscriptions, and remove DOM.
- **Style encapsulation:** If the Foldkit app uses Tailwind, the generated CSS needs to live inside the shadow root. This may require a build step to inject styles.

## Elm Architecture Considerations

- Messages remain facts, not commands. A custom element emitting an event is no different from a button click — the update function decides what to do with it.
- Imperative calls to web component methods (`.focus()`, `.reset()`, `.setValue()`) must go through Commands, not views. This keeps side effects in the right place.
- Two-way bindings (e.g. a web component that mutates a value and expects the host to read it back) should be avoided. Prefer the event-driven pattern: component emits event, Foldkit updates Model, re-render passes new value back as a property.

## Implementation Priority

1. **Property setting in vdom** — smallest change, biggest unlock. Lets Foldkit render any web component with rich data.
2. **Documentation and examples** — show the consume pattern with a real web component (e.g. Shoelace's `<sl-select>`)
3. **`Foldkit.mount` cleanup handle** — prerequisite for the "produce" direction
4. **Custom element wrapper utility** — convenience for packaging Foldkit apps as `<my-widget>`

## Dependencies

- No hard dependencies on other roadmap items
- Data attributes convention (Phase 1b) is complementary — Foldkit's own UI components would emit `data-*` attributes, while consumed web components use their own conventions
