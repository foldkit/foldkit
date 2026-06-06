---
'foldkit': minor
---

Generalize `FieldValidation` over the field's value type, group the rule constructors under a `Rule` namespace, and add `Rule.fromSchema`.

`Field` is now a function that takes the value schema for the field's editing buffer, so fields can hold values other than strings. `Field(S.String)` replaces the old bare `Field` for text inputs, and non-string fields are now supported, like `Field(S.Array(Tag))` for a multi-select. A scalar like a checkbox's boolean usually stays plain `S.Boolean`; wrap it in `Field` only when it needs the validation lifecycle. Validation rules stay separate in `makeRules`.

The rule constructors and the `Rule`/`RuleMessage` types now live under a `Rule` namespace: `import { Rule } from 'foldkit/fieldValidation'`, then `Rule.minLength(2)`, `Rule.email()`, and the type `Rule.Rule<string>`. New `Rule.fromSchema(schema, message)` builds a rule that passes when a value decodes through an Effect Schema, for reusing a domain codec or refined type you already maintain rather than duplicating its checks as a predicate.

Adds array rules `Rule.minItems`, `Rule.maxItems`, and `Rule.nonEmpty`. The default empty check now treats an empty array as empty (alongside the empty string), so a required multi-select rejects an empty selection.

Breaking changes:

- `Field` is a function. Replace `Field` in a Model or message with `Field(S.String)`, and `Field` type annotations with `Field<string>`.
- Rule constructors and the rule types moved under the `Rule` namespace. Replace `minLength(2)` with `Rule.minLength(2)`, `Rule<string>` with `Rule.Rule<string>`, and `RuleMessage` with `Rule.RuleMessage`.
- `Rule.Rule`, `Rule.RuleMessage`, `Rules`, and `MakeRulesOptions` are generic over the value type. `makeRules` defaults the value type to `string`; annotate other fields, e.g. `makeRules<ReadonlyArray<Tag>>({ ... })`.
