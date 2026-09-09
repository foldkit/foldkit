# Field Validation

Foldkit models field validation as data in your Model, not scattered logic across event handlers. Each field is a four-state discriminated union: `NotValidated`, `Validating`, `Valid`, and `Invalid`. This makes it impossible to render a success indicator while an error exists, or show a spinner when validation is already complete.

## Defining a Field

`makeRules` takes an options object and returns a `Rules` bundle. `Field(valueSchema)` builds the four-state Schema you put in your Model.

::Snippet{name="fieldValidationMakeRules" label="makeRules example"}

Every state carries the current `value`. `Invalid` also carries a non-empty `errors` array.

| Variant        | Meaning                                    |
| -------------- | ------------------------------------------ |
| `NotValidated` | Validation has not run.                    |
| `Validating`   | An async check is in flight.               |
| `Valid`        | Every applicable rule passed.              |
| `Invalid`      | One or more rules failed, with the errors. |

The Schema you pass `Field` should match what the control actually holds as the user edits, not the type you parse it into: `Field(Schema.String)` for text inputs, `Field(Schema.Array(Schema.String))` for a multi-select. A scalar like a checkbox’s boolean usually stays plain `Schema.Boolean` in the Model; wrap it in `Field` only when it needs the validation lifecycle. Values you reach by parsing text, like numbers and dates, stay `Field(Schema.String)`: a half-typed entry is still a string, so parse it into its domain type on submit. Validation rules stay separate, in the `Rules` bundle.

Each entry in the `rules` array is a `Rule`: a `[predicate, errorMessage]` tuple. Error messages can be static strings or functions that receive the invalid value. Foldkit ships built-in rules for common cases; see [Custom Rules](#custom-rules) to write your own.

Operations are free module functions that take a `Rules` bundle as their first argument. `Rules` itself has no methods; the sections below introduce each operation.

To construct a state directly (e.g. initial Model values, async Command results), use the module-level constructors: `NotValidated`, `Validating`, `Valid`, `Invalid`.

### Conditional Rules

A `Rules` bundle is just data, so build it from model state via a plain function.

::Snippet{name="fieldValidationConditional" label="conditional rules example"}

## Applying Validation

Call `validate(rules)(value)` to validate a value against a bundle of rules. It returns one of the four `Field` variants, failing fast at the first rule that fails. Use it in your update function with `evo` to set the field state.

::Snippet{name="fieldValidationApply" label="validate example"}

Empty values follow the bundle’s requiredness before any rules run. An empty required value becomes `Invalid` with the required message; an empty optional value becomes `NotValidated`. A non-empty value becomes `Valid` when every rule passes or `Invalid` when one fails.

Use `validateAll(rules)` when you want to collect every failing rule into the `errors` array rather than stopping at the first failure. Requiredness behaves the same way in both functions.

## Displaying Validation State

Use `FieldValidation.match` to handle the four states and derive border colors, status indicators, and error messages. Each handler receives the state's `value`, and `onInvalid` also receives the `errors`. For a single-field submit gate, use `isValid(rules)(state)`. If the rules are required, only `Valid` passes; if they are optional, `NotValidated` also passes. `Validating` and `Invalid` never pass.

For a form-level gate, pass `[state, rules]` pairs to `allValid`. A single call gates fields of one value type, so a form that mixes types calls `allValid` per type and combines the results with `&&`.

::Snippet{name="fieldValidationView" label="validation view example"}

`FieldValidation.match` requires a handler for every state, so no rendering path can forget one. Reach for Effect `Match` only when a partial match with a fallback reads better, as in the async example below.

Use `isInvalid(state)` or `anyInvalid(states)` when you specifically need to know whether validation has produced errors. They check for the `Invalid` tag. A required `NotValidated` field and a `Validating` field are not invalid, but they still fail an `isValid` submit gate.

## Async Validation

For server-side checks like “Is this email taken?”, use the `Validating` state as a bridge: run sync `validate` first, then transition to `Validating`, fire a Command, and handle the result message.

::Snippet{name="fieldValidationAsync" label="async validation example"}

The `validationId` pattern prevents race conditions. Each keystroke increments the ID, and the result handler only applies if the ID still matches. Responses from superseded requests are silently discarded.

## Custom Rules

A `Rule` is a `[predicate, errorMessage]` tuple. Write your own by pairing any predicate with an error message (a static string, or a function that receives the value).

::Snippet{name="fieldValidationCustomRule" label="custom rule example"}

Custom rules compose with built-in ones in the same `rules` array.

## Cross-Field Validation

A `Rule` only sees a single value. For checks that compare fields against each other (like “confirm password must match password”), handle the logic directly in your update function where you have access to the full model.

::Snippet{name="fieldValidationCrossField" label="cross-field validation example"}

Keep cross-field logic in update only when the check genuinely needs more than one value. Anything expressible as `[predicate, errorMessage]` over a single value fits better as a [custom rule](#custom-rules).

## Built-in Rules

Requiredness is not a rule. It is a `makeRules` option: pass `required: message` to make the field required, or omit it for an optional field. By default, Foldkit treats an empty string or empty array as missing. Whitespace and every other value, including the boolean `false`, count as present.

Pass an `isEmpty` predicate to `makeRules` when your control needs a different definition of empty. To require that a checkbox is checked, use a custom rule such as `[(checked) => checked, message]`; unchecked is a present but invalid boolean value, not an absent one.

| Rule                                 | Description                          |
| ------------------------------------ | ------------------------------------ |
| `Rule.minLength(min, message?)`      | Minimum character count              |
| `Rule.maxLength(max, message?)`      | Maximum character count              |
| `Rule.pattern(regex, message?)`      | Matches a regular expression         |
| `Rule.email(message?)`               | Valid email format                   |
| `Rule.url(options?)`                 | Valid URL format                     |
| `Rule.startsWith(prefix, message?)`  | Begins with a prefix                 |
| `Rule.endsWith(suffix, message?)`    | Ends with a suffix                   |
| `Rule.includes(substring, message?)` | Contains a substring                 |
| `Rule.equals(expected, message?)`    | Exact string match                   |
| `Rule.oneOf(values, message?)`       | Value is in a set of allowed strings |

For array-valued fields like a multi-select, validate with `Rule.minItems(min, message?)` and `Rule.maxItems(max, message?)`. A required array field already treats the empty array as missing, so reach for these when you need a specific count.

### Rules from a Schema

When a value is already modeled by a Schema, a domain codec, or a refined or branded type, `Rule.fromSchema(schema, message)` turns it into a rule, so the field stays in sync with that Schema instead of duplicating its checks. It does nothing a custom rule can’t, so reach for it only when you already maintain the Schema; for plain checks the dedicated rules above are clearer.

Its sweet spot is values where “valid” means “decodes”. The Schema can transform a string into a different type, like a `Calendar.CalendarDateFromIsoString` codec that parses a date the string-shaped rules can’t check, or refine and brand it, like a `Slug`. Either way the field reuses the one Schema as its rule, so the check can’t drift from the type you already maintain:

::Snippet{name="fieldValidationSchema" label="schema rule example"}

See the full [API reference](/api-reference/field-validation) for details on every export. For a complete working example with sync validation, async server checks, and form submission gating, see the [Form example](/example-apps/form). For sync-only validation with OutMessage context, see the [Auth example](https://github.com/foldkit/foldkit/tree/main/examples/auth/src/page/loggedOut/page/login.ts).
