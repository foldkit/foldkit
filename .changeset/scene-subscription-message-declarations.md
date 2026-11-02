---
'foldkit': minor
---

`Scene.inside(parent, ...steps)` returns a typed step group instead of a function. Pass the group to `scene` or to another `inside` call. Calls written directly in a Scene's step sequence need no change. Remove wrappers that invoked the returned value as a simulation-transform function. This example assumes `settingsPanel` and `saveButton` are Locators.

```ts
// Before
scene(
  { update, view },
  given(initialModel),
  (simulation: SceneSimulation<Model, Message>) =>
    inside(settingsPanel, click(saveButton))(simulation),
)

// After
scene(
  ApplicationLive,
  given(initialModel),
  inside(settingsPanel, click(saveButton)),
)
```
