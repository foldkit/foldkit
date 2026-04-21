---
'foldkit': minor
---

Add `freezeModel` runtime config — Foldkit now deep-freezes the Model in development by default, so accidental mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact write site with a clear stack trace, instead of silently corrupting state or breaking reference-equality change detection.

Freezing is scoped to plain objects and arrays. Effect-tagged values (`Option`, `Either`, `DateTime`, `HashSet`, `HashMap`, etc.), `Date`, `Map`, `Set`, and class instances are left untouched because they rely on lazy instance writes for hash memoization. Nested payloads inside an `Option.some` are still frozen.

Config shape mirrors `devtools` and `slowView`:

```ts
makeProgram({
  // ...
  freezeModel: { show: 'Development' }, // default
  // freezeModel: { show: 'Always' },   // enforce in production too
  // freezeModel: false,                // disable entirely
})
```

Production builds pay nothing for this feature unless `show: 'Always'` is set.
