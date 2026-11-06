---
'foldkit': minor
'@foldkit/ui': patch
'create-foldkit-app': patch
---

Keyed Bindings accept authored OutMessage folds directly and through key-dependent producers. Use a direct helper when handlers do not need the key:

```ts
.withOutMessagePolicy({
  fold: makeOutMessageFold(ChildBlock, {
    Selected: ({ value }) => applySelection(value),
  }),
})
```

When handlers need the occurrence key, return the helper from a callback or pass a compatible extracted factory:

```ts
.withOutMessagePolicy({
  fold: key => makeOutMessageFold(ChildBlock, {
    Removed: () => removeEntry(key),
  }),
})
```

The Binding supplies the OutMessage and FoldContext without a forwarding wrapper. Payloads, keys, Command requirements, OutMessages and sibling registrations stay checked. Configuration is passive, absent occurrences do not invoke producers, and parent Steps run after the child write. The explicit `(key, outMessage, context) => step` form remains supported. Returned folds must be authored with `makeOutMessageFold`; raw matchers are not a substitute.

Authored folds also retain the exact child Message contract used by `FoldContext`. A fold returned for a child with the same OutMessage but a different local Message contract is rejected both statically and at runtime, before its handler runs. Pure OutMessage forwarders remain compatible by their OutMessage contract alone because they do not receive FoldContext.

The scaffold guidance covers both forms and extracted factories. Keep callbacks that defer a declaration read or perform a meaningful adaptation.
