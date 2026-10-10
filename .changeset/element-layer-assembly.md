---
'foldkit': minor
---

Add `Application.makeElement` for container-scoped apps whose effect requirements are supplied with `Application.provide`. It infers requirements from the configured Flags Effect, init and update Commands, Subscriptions, registered Mounts, and ManagedResources. A fully provided Element can be passed to `Runtime.run` or `Runtime.embed`, and its Layers share one runtime lifetime with Ports and the Element's Model-driven effects.

Move the application's shared service Layer from `resources` into `Application.provide`, composing it with the feature's handler Layer. This example assumes the existing `ServicesLayer` supplies those services and the feature's `EffectsLayer` supplies the migrated handlers.

**Before**

```ts
const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  ports,
  container,
  resources: ServicesLayer,
})

const handle = Runtime.embed(element)
```

**After**

```ts
const AppLayer = Layer.provide(EffectsLayer, ServicesLayer)

const element = pipe(
  Application.makeElement({
    Model,
    init,
    update,
    view,
    ports,
    container,
  }),
  Application.provide(AppLayer),
)

const handle = Runtime.embed(element)
```

Import `Application` from `foldkit` and `Layer` and `pipe` from `effect`. Preserve the Element's Flags and other existing configuration, and include its rendered Mount definitions in `mounts`.

Provided variants of one Element share its embed activity and disposal ordering. Only one variant can be embedded at a time, and embedding after disposal waits for the previous runtime's cleanup.
