---
'foldkit': minor
---

Restrict Scene's `Subscription.emit` to Messages declared by the Scene's registered Subscriptions. Pass the Subscription record into `scene({ update, view, subscriptions }, ...steps)`. Named entries declare their emitted Message Schemas. Scenes without registered Subscriptions cannot use `Subscription.emit`.

Use `Subscription.emit(subscriptions.ticks, message)` to identify both the registered source and its Message. Runtime validation checks the full declared Schema before dispatch, including payloads, and rejects an entry that is not registered with the Scene.

**Before**

```ts
scene({ update, view }, given(model), Subscription.emit(Message.Ticked()))
```

**After**

```ts
scene(
  { update, view, subscriptions },
  given(model),
  Subscription.emit(subscriptions.ticks, Message.Ticked()),
)
```

For a lifted Subscription, emit its declared child Message. Scene applies the Subscription's child-to-parent mappings before passing the Message to update. Parent wrapper Messages must not be fabricated to bypass the child's declared Message contract. Preserve inferred registration records and use direct aggregation so their exact Message declarations remain available to the Scene type.

Migrate tests that used `Subscription.emit` to simulate a DOM interaction or Command result to the appropriate interaction or `Command.resolve` step.

`inside(parent, ...steps)` returns a typed step group that preserves nested Message declarations. Pass that group to `scene` or another `inside` group. Existing calls in a Scene's step sequence need no syntax change. Remove wrappers that invoked the returned value as a simulation-transform function. This example assumes `settingsPanel` and `saveButton` are Locators.

**Before**

```ts
import type { SceneSimulation } from 'foldkit/scene'

scene(
  { update, view },
  given(initialModel),
  (simulation: SceneSimulation<Model, Message>) =>
    inside(settingsPanel, click(saveButton))(simulation),
)
```

**After**

```ts
scene(
  { update, view },
  given(initialModel),
  inside(settingsPanel, click(saveButton)),
)
```
