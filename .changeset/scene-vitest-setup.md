---
'foldkit': minor
---

Add `foldkit/test/vitest` subpath export with a `setup()` helper that registers Foldkit's Scene matchers with Vitest and augments `Assertion<T>` with their types. Replaces the ~24 lines of `expect.extend` + `declare module 'vitest'` boilerplate every consumer had to copy into their `vitest-setup.ts`:

```ts
// vitest-setup.ts
import { setup } from 'foldkit/test/vitest'

setup()
```
