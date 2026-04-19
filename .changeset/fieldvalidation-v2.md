---
'foldkit': minor
---

Redesign `FieldValidation` around a single string-typed field abstraction.

The module is scoped to form-field edit state: the lifecycle of a value as a
user types into an input. For validating static data, use Effect Schema
directly.

- `makeField(schema, options)` → `makeRules(options)`. The descriptor no longer
  takes a schema; every field has `value: string`. Required-ness is a
  `makeRules` option (`required: message`), not a rule in the list.
- The four-state union is now exported as `Field` at module level, shared
  across every field. Use `Field` as the type in your Model.
- State constructors (`NotValidated`, `Validating`, `Valid`, `Invalid`) are
  exported at module level too. Use them to construct states directly
  (e.g. in async validation Commands and initial Model values).
- Validations (`[predicate, errorMessage]` tuples) are now called `Rule`.
  The array field on `makeRules` options is `rules`, not `validations`.
- Two new helpers: `isRequired(rules)` for view affordances like rendering a
  `*` on required field labels, and `allValid(pairs)` for form-level submit
  gates that fold across a list of `(state, rules)` pairs.
- Number validators (`min`, `max`, `between`, `positive`, `nonNegative`,
  `integer`) have been removed. They couldn't be used with the string-only
  `Field`. If you need to validate a number parsed from input, write a custom
  `Rule` that does the parse and the check together.

```ts
import {
  Field,
  Invalid,
  NotValidated,
  Valid,
  allValid,
  email,
  makeRules,
  minLength,
  validate,
} from 'foldkit/fieldValidation'

const emailRules = makeRules({
  required: 'Email is required',
  rules: [email('Please enter a valid email')],
})

const passwordRules = makeRules({
  required: 'Password is required',
  rules: [minLength(8, 'Must be at least 8 characters')],
})

const Model = S.Struct({
  email: Field,
  password: Field,
})

// In update (input → state):
const nextEmail = validate(emailRules)(value)

// Initial state in Model:
const initialEmail = NotValidated({ value: '' })

// Form-level submit gate:
const canSubmit = allValid([
  [model.email, emailRules],
  [model.password, passwordRules],
])

// Direct construction in async Commands:
Valid({ value: email })
Invalid({ value: email, errors: ['Already taken'] })
```

### Migration

- **`makeField(S.String, options)`** → `makeRules(options)`.
- **`type StringField = typeof StringField.Union.Type`**: delete. Import `Field` from `foldkit/fieldValidation` where you need the type.
- **`StringField.Union` as the Model field type**: replace with `Field`.
- **`StringField.Valid({ value })` / `.Invalid(...)` / `.Validating(...)` / `.NotValidated(...)`**: use the module-level constructors `Valid({ value })`, `Invalid({...})`, etc.
- **`FieldValidation.required(message)` as a list item**: remove it from the list, pass `required: message` to `makeRules`.
- **`FieldValidation.optional(rule)` wrapper**: delete; absence of `required` makes the field optional, and `validate` returns `NotValidated` for empty values automatically.
- **`StringField.validate(list)(value)` / `.validateAll(list)(value)`**: replace with `validate(rules)(value)` / `validateAll(rules)(value)` (free functions, rules-scoped).
- **`FieldValidation.init(field)(value)`**: removed. Use `NotValidated({ value })` directly.
- **Hand-rolled `field._tag === 'Valid'` submit checks**: replace with `allValid(pairs)` for form-level gates or `isValid(rules)(state)` for single fields. Both are rules-aware (required demands `Valid`; optional also accepts `NotValidated`).
- **`validations` options field**: renamed to `rules`.
- **`Validation<T>` / `ValidationMessage<T>` types**: renamed to `Rule` / `RuleMessage` (no generic; both fixed to `string`).
