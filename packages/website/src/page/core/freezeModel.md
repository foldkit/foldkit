# Freeze Model

## Mutation Detection {#overview}

Foldkit depends on immutable Model updates. TypeScript's `readonly` checks source code, but it cannot stop a write at runtime. If code mutates `model.items` in place, reference equality can no longer tell which parts changed. A Subscription may keep stale dependencies, and the view may leave stale DOM on screen.

During development, Foldkit deep-freezes the Model after init and after every update. An accidental write then throws a `TypeError` at the write site instead of producing a later rendering or Subscription bug.

Freezing runs only when Vite HMR is active. Set `freezeModel` to `false` to disable it, but do not use that option to hide a mutation the guardrail found.

## Scope

Foldkit freezes values selectively:

- Plain objects and arrays are frozen recursively.
- Effect values such as `Option`, `Result`, `DateTime`, `HashSet`, `HashMap`, and `Chunk` are not frozen. They may cache a hash on first use, which requires writing to the instance.
- `Date`, `Map`, `Set`, `File`, and class instances are not frozen.

`Option.some` has one extra rule. Its wrapper remains writable for Effect's hash cache, but Foldkit freezes a plain object or array inside it. Mutating the array in `Option.some({ items: [...] })` still throws.

Messages are not frozen. The guardrail applies only to the Model.

Already-frozen values are skipped. Because `evo` preserves unchanged branches by reference, each update freezes only the newly created plain objects and arrays.
