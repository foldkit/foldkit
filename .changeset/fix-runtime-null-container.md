---
'foldkit': minor
---

`Runtime.makeProgram` now handles a null container gracefully. When the entry module is imported in a vitest scene test (where there is no `#root` element to mount on), `makeProgram` returns an `Inactive` runtime and `Runtime.run` becomes a no-op, so test output stays clean. Passing a real element without an `id` now throws synchronously at `makeProgram` time with a clear error, instead of dying asynchronously deep inside the runtime startup.

`MakeRuntimeReturn` is now a discriminated union: `{ _tag: 'Active', runtimeId, start } | { _tag: 'Inactive' }`. Code that only calls `Runtime.run(program)` is unaffected.
