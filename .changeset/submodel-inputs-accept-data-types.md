---
'foldkit': patch
---

Fix `h.submodel` `viewInputs` rejecting Effect data types like `Option<T>` at the type level. The previous `ValidatedInputs` walker descended one level into every object-typed field and flagged any function member as a "nested function in viewInputs" error. For types like `Option<T>`, `Either<E, A>`, or any value whose prototype carries methods (`pipe`, `toString`, `[Symbol.iterator]`, ...), TypeScript surfaces those prototype members via `keyof`, so the structural check rejected well-formed data values that the runtime walker would accept.

The type-level walk has been removed. The runtime walker is unchanged and still catches genuinely-nested callbacks like `viewInputs: { config: { onSubmit: () => ... } }` at view-build time with a clear path-based error (`viewInputs.config.onSubmit`). Two `@ts-expect-error` companion tests in `submodel.test.ts` are dropped since the type-level rejection is no longer enforced; the runtime tests covering the same misuses remain. Threading `Option`, `Either`, branded domain types, and similar data values through `viewInputs` now type-checks.
