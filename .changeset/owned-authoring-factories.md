---
'foldkit': minor
'@foldkit/oxlint-plugin': patch
---

Rename Definition-owned authoring factories to the `make*` family. The new names identify calls that construct Command and Mount Definitions, lifecycle registries, passive Bindings, and reusable Steps.

| Before                             | After                                             |
| ---------------------------------- | ------------------------------------------------- |
| `Definition.command(...)`          | `Definition.makeCommand(...)`                     |
| `Definition.mount(...)`            | `Definition.makeMount(...)`                       |
| `Definition.mountStream(...)`      | `Definition.makeMountStream(...)`                 |
| `Definition.resource(...)`         | `Definition.makeResource(...)`                    |
| `Definition.subscriptions(...)`    | `Definition.makeSubscriptions(...)`               |
| `Definition.managedResources(...)` | `Definition.makeManagedResources(...)`            |
| `Definition.bindChild(...)`        | The matching storage-specific Binding constructor |
| `Definition.step(...)`             | `Definition.makeStep(...)`                        |
| `Definition.stepFields(...)`       | `Definition.makeFieldsStep(...)`                  |
| `Definition.stepNoop()`            | `Definition.makeNoopStep()`                       |

The same primitive factory names apply to the early Namespace used by generic Block factories. `Definition.makeCommandsStep(...)` already uses the final name.

Completion fields such as `subscriptions` and `managedResources`, completed Block metadata, and standalone Command and Update APIs keep their existing names. The old Definition and Namespace factory names have no compatibility aliases.

Update the ownership, routing, state, Mount, and Command lint rules and their fixtures to recognize the renamed factories, so newly authored applications keep the same enforcement.
