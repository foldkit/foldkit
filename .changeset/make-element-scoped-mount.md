---
'foldkit': minor
---

Split the runtime into `makeApplication` and `makeElement`, following Elm's `Browser.application` / `Browser.element` convention.

**Breaking:** `Runtime.makeProgram` is renamed to `Runtime.makeApplication`. The behavior is identical (its `view` returns a `Document`; the runtime owns `document.title` and the canonical / og:url tags). The associated exported types are renamed to match: `ProgramConfig` → `ApplicationConfig`, `ProgramConfigWithFlags` → `ApplicationConfigWithFlags`, `RoutingProgramConfig` → `RoutingApplicationConfig`, `RoutingProgramConfigWithFlags` → `RoutingApplicationConfigWithFlags`, `ProgramInit` → `ApplicationInit`, `RoutingProgramInit` → `RoutingApplicationInit`. To migrate, replace `makeProgram` with `makeApplication` (and the `*Program*` type names with their `*Application*` equivalents).

**New:** `Runtime.makeElement` mounts a Foldkit app scoped to a DOM node. Its `view` returns `Html` directly (no title to discard) and the runtime never touches the document `<head>`, so an app can be embedded on a page it does not own without clobbering the host page's `title`, `canonical`, or `og:url`. Everything else (Model, `init`, `update`, Commands, Subscriptions, flags, crash handling) works exactly as it does with `makeApplication`. Embedded apps do not own the URL bar, so `makeElement` has no `routing` config. New types: `ElementConfig`, `ElementConfigWithFlags`, `ElementCrashConfig`, `ElementInit`.

```ts
import { Runtime } from 'foldkit'

import { Model, init, update, view } from './main'

// view: (model) => Html

const program = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

Runtime.run(program)
```
