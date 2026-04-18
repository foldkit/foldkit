---
'foldkit': minor
---

Add `FieldValidation.optional`, a combinator that wraps a string `Validation` so empty strings pass without being checked. Useful for fields that are optional but must be valid when filled in (e.g. an optional email).

```ts
FieldValidation.validate([
  FieldValidation.optional(FieldValidation.email()),
  FieldValidation.optional(FieldValidation.maxLength(100)),
])(model.websiteInput)
```
