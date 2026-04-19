---
'foldkit': minor
---

Add `isInvalid` and `anyInvalid` tag-only predicates to `FieldValidation`.

`isInvalid(state)` returns `true` when the state's tag is `Invalid`. Unlike
`!isValid(rules)(state)`, it does not treat `NotValidated` or `Validating` as
errors — it's a tag-only predicate that answers "has the user seen a rule
failure on this field?"

`anyInvalid(states)` returns `true` when any state in the input has tag
`Invalid`. Use for "this step/section has errors" affordances, independent
of rules.

Together these fill out the state-only quadrant alongside the existing
rules-aware `isValid(rules)(state)` and `allValid(pairs)`:

```ts
// Rules-aware (needs rules): "is this state acceptable?"
isValid(rules)(state)
allValid([[state, rules], ...])

// Tag-only (no rules): "has the state hit Invalid?"
isInvalid(state)
anyInvalid([state, ...])
```

Useful for view-side affordances like red-dot step indicators or border
colors, where the question is about the state's tag rather than whether
the rules are currently satisfied.
