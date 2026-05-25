---
'foldkit': minor
---

`Ui.Checkbox` gains a `SetChecked({ isChecked: boolean })` Message and a
matching `setChecked(model, isChecked)` programmatic helper. `SetChecked`
forces the checked state to a specific value (unlike `Toggled`, which
flips) and emits the same `ToggledChecked({ isChecked })` OutMessage so
consumers react to programmatic state assignment the same way they react
to user toggles. Use this in domain-event handlers that need to assign a
specific state, such as a "select all" handler that forces every child
checkbox to the same value:

```ts
GotSelectAllMessage: () => {
  const isAllChecked = Array.every(
    [model.optionA, model.optionB],
    ({ isChecked }) => isChecked,
  )
  const nextChecked = !isAllChecked

  const [nextOptionA] = Ui.Checkbox.setChecked(model.optionA, nextChecked)
  const [nextOptionB] = Ui.Checkbox.setChecked(model.optionB, nextChecked)

  return [
    evo(model, {
      optionA: () => nextOptionA,
      optionB: () => nextOptionB,
    }),
    [],
  ]
}
```

Previously the only update path was `Toggled`, whose flip semantics could
not reliably reach a target state when child checkboxes started in mixed
states. The convention pushed consumers to assign `isChecked` directly on
the submodel field, bypassing `Ui.Checkbox.update`. `setChecked` is the
idiomatic route.
