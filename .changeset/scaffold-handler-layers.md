---
'create-foldkit-app': minor
---

Scaffold applications with `ApplicationComposition.makeApplication` and provide the SSR template's cookie-writing Command through a handler Layer. The generated Foldkit guidance explains handler composition, application service lifetimes, and choosing dependency providers at the application root so execution tests can run the real handlers with test services. Handlers and services may keep execution bookkeeping, while application workflow state and submission rules remain in the Model and update.

Generated guidance uses exact required and Option field Bindings, distinguishes whole-child `presentWhen` from Subscription-only gates, and explains direct keyed arrays with stable Struct keys. Custom relationships retain explicit accessors, and existing differing placements remain explicit.
