---
'foldkit': minor
---

Consolidate `makeElement` and `makeApplication` into a single `makeProgram` function. The presence of a `routing` config determines whether the program has URL routing. Rename `BrowserConfig` to `RoutingConfig` and the `browser` config key to `routing`.

**Migration:**

- `Runtime.makeElement(config)` → `Runtime.makeProgram(config)`
- `Runtime.makeApplication(config)` → `Runtime.makeProgram(config)`
- `browser: { onUrlRequest, onUrlChange }` → `routing: { onUrlRequest, onUrlChange }`
- `Runtime.BrowserConfig` → `Runtime.RoutingConfig`
- `Runtime.ElementInit` → `Runtime.ProgramInit`
- `Runtime.ApplicationInit` → `Runtime.RoutingProgramInit`
- `Runtime.ElementConfigWithFlags` → `Runtime.ProgramConfigWithFlags`
- `Runtime.ElementConfigWithoutFlags` → `Runtime.ProgramConfig`
- `Runtime.ApplicationConfigWithFlags` → `Runtime.RoutingProgramConfigWithFlags`
- `Runtime.ApplicationConfigWithoutFlags` → `Runtime.RoutingProgramConfig`
