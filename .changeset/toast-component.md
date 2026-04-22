---
'foldkit': minor
---

Add `Ui.Toast` — a headless stack of transient notifications anchored to a corner of the viewport, parameterized on a user-provided payload schema. Each entry runs its own enter/leave animation via a `Transition.Model` submodel and its own auto-dismiss timer, with pause-on-hover. One container lives at the app root; entries are added dynamically via `Toast.show(model, input)`.

The component owns only lifecycle and a11y fields — id, variant (drives ARIA role), transition, dismiss timer, hover state. **Content is entirely the consumer's concern:** bind a Toast module to your own payload schema via `Ui.Toast.make(PayloadSchema)`, and the resulting Model, Message, `show`, `view`, and `renderEntry` callback are all typed to your shape.

```ts
const ToastPayload = S.Struct({
  bodyText: S.String,
  maybeLink: S.OptionFromSelf(S.Struct({ href: S.String, text: S.String })),
})
export const Toast = Ui.Toast.make(ToastPayload)

// ...

Toast.show(model.toast, {
  variant: 'Success',
  payload: {
    bodyText: 'Order shipped',
    maybeLink: Option.some({ href: '/order/abc', text: 'Track' }),
  },
})
```

Notable design choices:

- **Parameterized on payload, opinionated only on a11y.** The component reads `variant` (to pick `role="status"` vs `role="alert"`) and the lifecycle fields it owns. It never reads payload. Anything text-level, link-level, interactive, or visual is in the consumer's payload schema and rendered by their `renderEntry`.
- **Dynamic children.** Toast's Model holds a runtime-varying list of submodel-like entries. Entry IDs come from a monotonic `nextEntryKey` counter in Model, keeping the system fully reproducible without a side-effecting Command.
- **Headless `renderEntry(entry, handlers)`.** Each entry is wrapped in an `<li>` by the component (with role, hover lifecycle, and transition data attributes); consumers render the inner content and wire `handlers.dismiss` to their close button.
- **Cancellable auto-dismiss.** Each entry carries `pendingDismissVersion`; hover and manual dismiss bump the version so stale `ElapsedDuration` messages are discarded when they fire. `LeftEntry` reschedules with the fresh version.
- **Six positions** (TopLeft, TopCenter, TopRight, BottomLeft, BottomCenter, BottomRight) stack toward the anchored edge via CSS flex direction — newest closest to the edge, no manual ordering required. `position` is a `view` prop rather than a Model field, so it can vary per render.
- **Accessibility.** Container is `role="region"` with `aria-live="polite"`, always mounted so screen readers observe the live region from page load. Entries get `role="status"` for Info/Success and `role="alert"` for Warning/Error.
- **Focus-based pause deferred.** Foldkit's OnFocus/OnBlur use non-bubbling events, so pausing while a focusable child has focus is not yet supported. Toasts pause on pointer hover only; keyboard users can dismiss manually. Tracked in FOL-202 / FOL-203.
