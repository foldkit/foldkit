---
'foldkit': minor
---

Rename `Submodel.defineView`'s third type parameter from `Inputs` to `ViewInputs`, and rename the `inputs` field on `h.submodel` (and on `SubmodelConfig`) to `viewInputs`.

Every other field on `h.submodel({...})` names its destination (`model`, `view`, `toParentMessage`); `inputs` was the only one whose name didn't carry the role. `viewInputs` makes the call site self-describing without forcing a glance at the type parameters.

### Migration

```ts
// Before
export const view = Submodel.defineView<Model, Message, Inputs>(
  (model, inputs) => h.div([], [inputs.summary]),
)

h.submodel({
  id: 'panel',
  view: Panel.view,
  model: model.panel,
  inputs: { summary: h.span([], ['hi']) },
  toParentMessage: message => GotPanelMessage({ message }),
})

// After
export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs) => h.div([], [viewInputs.summary]),
)

h.submodel({
  id: 'panel',
  view: Panel.view,
  model: model.panel,
  viewInputs: { summary: h.span([], ['hi']) },
  toParentMessage: message => GotPanelMessage({ message }),
})
```

Runtime behavior is unchanged. The nested-function guard error message now references `viewInputs.path.to.callback` instead of `inputs.path.to.callback`. Consumer migration is a mechanical find-replace on three identifiers: the `Inputs` type parameter, the `inputs:` field, and the `inputs` view callback parameter.
