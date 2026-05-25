---
'foldkit': minor
---

`Ui.Switch` gains a `SetChecked({ isChecked: boolean })` Message and a
matching `setChecked(model, isChecked)` programmatic helper, mirroring
`Ui.Checkbox.setChecked`. `SetChecked` forces the checked state to a
specific value (unlike `Toggled`, which flips) and emits the same
`ToggledChecked({ isChecked })` OutMessage so consumers react to
programmatic state assignment the same way they react to user toggles.
Use this in domain-event handlers that need to assign a specific state
rather than flip the current one:

```ts
const [nextSwitch] = Ui.Switch.setChecked(model.notifications, true)
return [evo(model, { notifications: () => nextSwitch }), []]
```

Previously the only update path was `Toggled`, whose flip semantics could
not reliably reach a target state. The convention pushed consumers to
assign `isChecked` directly on the submodel field, bypassing
`Ui.Switch.update`. `setChecked` is the idiomatic route.
