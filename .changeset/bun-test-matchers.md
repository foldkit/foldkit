---
'foldkit': minor
---

Add `foldkit/test/bun`, which registers Foldkit's Scene matchers with the `expect` from `bun:test` and adds their types to its `Matchers` interface. Call `setup()` from a file that `bunfig.toml` preloads, the way `foldkit/test/vitest` is called from a Vitest setup file:

```ts
// src/bun-setup.ts
import { setup } from 'foldkit/test/bun'

import { GlobalRegistrator } from '@happy-dom/global-registrator'

GlobalRegistrator.register({ url: 'http://localhost:3000' })
setup()
```

The entry point needs Bun's type declarations from `@types/bun` and loads them into the project that imports it, so `tsconfig.json` needs no `types` entry. Projects that import only `foldkit/test/vitest` never load Bun's types. The Testing with Bun section of the Testing docs covers the rest of the setup, including why `GlobalRegistrator.register` needs a `url`.
