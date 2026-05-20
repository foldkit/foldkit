---
'foldkit': minor
---

Two coordinated changes to the `h.submodel` story.

**1. Add `emit` to `h.submodel`.** A per-tag handler map that takes precedence over `wrapWith` for matching child Messages. Lets the parent declare high-level event reactions declaratively without pattern-matching the child's full Message union inside its `GotChildMessage` case:

```ts
h.submodel({
  id: 'date-picker',
  view: Ui.DatePicker.view,
  model: model.picker,
  wrapWith: GotPickerMessage,
  wrapArgs: {},
  emit: {
    SelectedDate: ({ date }) => SubmittedDate({ date }),
    Cancelled: () => DismissedPicker(),
  },
})
```

When the child dispatches a message whose `_tag` matches a key in `emit`, the matching handler runs INSTEAD of `wrapWith` for that message. Unmatched tags still flow through `wrapWith`. TS narrows each handler's argument to the specific variant via `Extract`, so the destructured fields are correctly typed without manual annotation.

Memoization is preserved because `emit` lives in the runtime's scope registry (same side-table as `wrapWith`/`wrapArgs`) and is refreshed each render. The cached child VNode never stores any emit closure; it just carries the scope id and the raw child Message, looked up at dispatch time.

**2. Migrate `Ui.Checkbox` to the `h.submodel` shape.** Checkbox.view is now `(model: Model, inputs: ViewInputs) => Html` with no `ParentMessage` generic and no `toParentMessage` callback. The Checkbox dispatches its own `Toggled` Message directly; the parent declares the wrapping at the `h.submodel` embed site:

```ts
// Before
Ui.Checkbox.view({
  model: model.checkbox,
  toParentMessage: msg => GotCheckboxMessage({ message: msg }),
  toView: attrs => h.div(...),
})

// After
h.submodel({
  id: 'my-checkbox',
  view: Ui.Checkbox.view,
  model: model.checkbox,
  inputs: {
    toView: attrs => h.div(...),
  },
  wrapWith: ({ message }: { message: Ui.Checkbox.Message }) =>
    GotCheckboxMessage({ message }),
  wrapArgs: {},
})
```

`CheckboxAttributes` is typed `ReadonlyArray<Attribute<never>>` so the consumer can spread the attribute arrays directly into their own scope's elements regardless of the consumer's Message type. The runtime wraps the OnClick dispatch via the `h.submodel` scope chain at event-fire time.

`Ui.Checkbox.lazy` is removed — `h.submodel` provides the boundary memoization, and the old `lazy` was effectively a no-op anyway (its cache key included `toParentMessage`, which is freshly constructed every render).

All Checkbox call sites in the repo are updated: `job-application` (workEntry, educationEntry), `ui-showcase` (checkbox + fieldset views), and `website` (checkbox + fieldset pages, demo snippets). When the surrounding chain itself migrates to `h.submodel`, the Checkbox boundary memoizes end-to-end; for now the wrapWith closure at the call site is per-render and the Checkbox view runs every parent render, same as before the migration. The structural win is that Checkbox is no longer parameterized over the parent's Message type.

Migrating other Ui primitives is a follow-up. The patterns established here (model + inputs shape, `Attribute<never>` for slot attributes, `wrapWith` annotated with `{ message: Ui.Foo.Message }`) carry over directly.
