---
'foldkit': minor
---

Add owned `ApplicationComposition.makeElement` for container-scoped applications. It captures the Composition's Model, Message, and included child Bindings. Completion infers requirements from Flags, init and update Commands, Subscriptions, Mounts, and ManagedResources. The completed Element's `provide` method satisfies ordinary Service requirements before `Runtime.run` or `Runtime.embed` starts it.

**Before**

```ts
import { Runtime } from 'foldkit'
import { Model, init, update, view } from './main'
import { ServicesLayer } from './resources'

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
import { Runtime } from 'foldkit'
import { ApplicationComposition } from './application'
import { init } from './init'
import { ApplicationLayer } from './layer'
import { ports } from './port'
import { update } from './update'
import { view } from './view'

const element = ApplicationComposition.makeElement({
  init,
  update,
  view,
  ports,
  container,
})

const handle = Runtime.embed(element.provide(ApplicationLayer))
```

Preserve existing Flags and other host configuration. Include local lifecycle declarations and `EffectsLayer` in completion when present. Registered child Bindings contribute their declarations and handler recipes automatically.

Provided variants of one Element share its embed activity and disposal ordering. Only one variant can be embedded at a time, and embedding after disposal waits for the previous runtime's cleanup.
