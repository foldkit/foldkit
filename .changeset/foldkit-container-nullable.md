---
'foldkit': minor
---

Widen `makeProgram`'s `container` input to `HTMLElement | null`.

```ts
// Before
container: document.getElementById('root')!,

// After (the `!` is no longer required)
container: document.getElementById('root'),
```

If the element is missing, the runtime throws a clear error at the `makeProgram` call site.
