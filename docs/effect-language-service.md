# Effect language service

Foldkit is built on Effect, so the Effect-4 semantic diagnostics from
[`@effect/language-service`](https://github.com/Effect-TS/language-service) apply
directly to Foldkit application code: floating Effects (including a Command that
is created but never returned), missing error or context channels, `Schema` over
`JSON.parse`, and Layer composition checks. It is the semantic companion to the
syntactic `@foldkit/oxlint-plugin`.

The plugin is wired into `tsconfig.base.json`, so every workspace package and
example inherits it, and every scaffolded app (via `create-foldkit-app`) gets it
too.

## Severity preset (browser / TEA)

The base config ships a preset tuned for browser apps:

- `processEnv` and `processEnvInEffect` are `off`. Browser apps read configuration
  through `import.meta.env` (Vite), never `process.env`, so those rules do not
  apply. A Node package under `packages/` can re-tighten them in its own tsconfig.
- `preferSchemaOverJson` is a `warning`.
- `ignoreEffectWarningsInTscExitCode` and `ignoreEffectSuggestionsInTscExitCode`
  are `true`, so only Effect **errors** (for example a floating Effect) affect the
  `tsc` exit code. Warnings and suggestions ride along as advisory signal.

## Editor vs CI

`@effect/language-service` is a TypeScript language-service plugin. That means:

- **Editors (tsserver)** pick it up with no extra step. Open a Foldkit file and
  the diagnostics appear inline.
- **`tsc` / CI** only load language-service plugins after the TypeScript install
  is patched:

  ```sh
  pnpm effect-language-service patch
  ```

  Run once after install (a `prepare` hook is a natural home). The patch is
  idempotent and reversible with `effect-language-service unpatch`. Until then,
  `pnpm -r typecheck` behaves exactly as before, so wiring the plugin changes no
  existing CI behavior.

## Try it

Drop a floating Effect into any example and run a patched `tsc`:

```ts
import { Effect } from 'effect'

export const oops = () => {
  Effect.sync(() => 42) // never yielded or returned
  return 1
}
```

```
error TS3: This Effect value is neither yielded nor used in an assignment.
```
