---
'@foldkit/ui': minor
---

Make `Checkbox`, `Switch`, and `Disclosure` stateless controlled render helpers and remove their Submodel forms. Following `RadioGroup`, each holds only the value the parent already owns (`isChecked` / `isOpen`), so the Submodel Model was a mirror carrying a reflect-on-every-transition sync obligation. Each now exposes a single `view(ViewConfig)`:

- `Checkbox.view` / `Switch.view` take `isChecked` and dispatch `onToggle(isChecked)` with the new state.
- `Disclosure.view` takes `isOpen` and dispatches `onToggle(isOpen)`, and still exposes `buttonId` plus the `animatePanel` helper.

The parent owns the state and just stores the value in `update`. There is no focus Command: Disclosure's toggle is button-driven so focus stays on the button, and a programmatic open/close should not steal focus.

BREAKING: `Model`, `init`, `update`, `setChecked`, `reflectChecked` (Checkbox/Switch), `toggle`, `close`, `reflectOpenState`, `FocusButton`, `CompletedFocusButton` (Disclosure), the `OutMessage`/`Message`/`Toggled`/`SetChecked`/`Closed`/`ToggledChecked`/`ToggledOpenState` schemas, and the `InitConfig`/`ViewInputs` types are removed from all three. Move each usage to a parent-owned Model field rendered with `view`: store the value, handle the `onToggle` Message in `update`, and delete the `Got*` plumbing. Your `toView` markup moves over unchanged; the attribute bundles keep their names and contents. A "select all" now sets the child fields directly instead of calling `setChecked`. Part of #676.

Before, with the Submodel form:

```ts
// model
acceptTerms: Checkbox.Model,

// view
h.submodel({
  slotId: 'accept-terms',
  model: model.acceptTerms,
  view: Checkbox.view,
  viewInputs: { toView: attributes => ... },
  toParentMessage: message => GotAcceptTermsMessage({ message }),
})

// update: delegate to Checkbox.update, then match the ToggledChecked
// OutMessage to read the new value
```

After, with the controlled helper:

```ts
// model
acceptedTerms: S.Boolean,

// view
Checkbox.view<Message>({
  id: 'accept-terms',
  isChecked: model.acceptedTerms,
  onToggle: isChecked => ToggledTerms({ isChecked }),
  toView: attributes => ...,
})

// update
ToggledTerms: ({ isChecked }) => [
  evo(model, { acceptedTerms: () => isChecked }),
  [],
],
```
