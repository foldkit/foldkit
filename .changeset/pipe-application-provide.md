---
'foldkit': minor
---

Move application Layer provision onto completed Application and Element programs. Remove the standalone `provide` export from `foldkit/application`.

Call `ApplicationComposition.makeApplication(...)` or `ApplicationComposition.makeElement(...)` first, then call the lowercase completed value's `provide` method:

```ts
// Before
import { provide } from 'foldkit/application'

Runtime.run(provide(application, ApplicationLayer), { flags })

// After
Runtime.run(application.provide(ApplicationLayer), { flags })
```

Use `element.provide(ApplicationLayer)` for an Element. Do not call `ApplicationComposition.provide`: the Composition owns `makeApplication` and `makeElement`, while their completed programs own `provide`.

Each `provide` call returns a new passive program. It removes the Layer's outputs from the program's unmet Service requirements, carries the Layer's own requirements forward, and preserves an Application's Flags contract. Extra Layer outputs remain available to Flags and other runtime Effects. Calls may be chained; provide a dependent Layer before the Layer that satisfies its requirements. The Runtime builds the accumulated Layers only when it starts the resulting program.
