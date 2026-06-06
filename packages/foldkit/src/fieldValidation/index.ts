import { Array, Option, Result, Schema as S, String, pipe } from 'effect'

import { ts } from '../schema/index.js'
import { type Rule, type RuleMessage, resolveMessage } from './rule.js'

// STATE

/** The `NotValidated` state: user hasn't interacted yet. */
export type NotValidated<A> = Readonly<{ _tag: 'NotValidated'; value: A }>

/** The `Validating` state: async validation is in flight. */
export type Validating<A> = Readonly<{ _tag: 'Validating'; value: A }>

/** The `Valid` state: every rule passed. */
export type Valid<A> = Readonly<{ _tag: 'Valid'; value: A }>

/** The `Invalid` state: one or more rules failed. Carries a non-empty `errors` array. */
export type Invalid<A> = Readonly<{
  _tag: 'Invalid'
  value: A
  errors: Array.NonEmptyReadonlyArray<string>
}>

/** The four-state union that represents a field's value in the Model. */
export type Field<A> = NotValidated<A> | Validating<A> | Valid<A> | Invalid<A>

/** Constructs a `NotValidated` state. */
export const NotValidated = <A>(
  field: Readonly<{ value: A }>,
): NotValidated<A> => ({
  _tag: 'NotValidated',
  value: field.value,
})

/** Constructs a `Validating` state. */
export const Validating = <A>(
  field: Readonly<{ value: A }>,
): Validating<A> => ({
  _tag: 'Validating',
  value: field.value,
})

/** Constructs a `Valid` state. */
export const Valid = <A>(field: Readonly<{ value: A }>): Valid<A> => ({
  _tag: 'Valid',
  value: field.value,
})

/** Constructs an `Invalid` state. */
export const Invalid = <A>(
  field: Readonly<{ value: A; errors: Array.NonEmptyReadonlyArray<string> }>,
): Invalid<A> => ({
  _tag: 'Invalid',
  value: field.value,
  errors: field.errors,
})

/** Builds the four-state `Field` schema for a value of the given schema. Put the
 *  result in your Model. The value schema is the field's editing buffer, so use
 *  the loose representation a control actually holds: `Field(S.String)` for text
 *  inputs, `Field(S.Array(Tag))` for a multi-select. A scalar like a checkbox's
 *  boolean usually stays plain `S.Boolean` in the Model; wrap it in `Field` only
 *  when it needs the validation lifecycle. Validation rules stay separate, in a
 *  `makeRules` bundle. */
export const Field = <A, I>(valueSchema: S.Codec<A, I>) =>
  S.Union([
    ts('NotValidated', { value: valueSchema }),
    ts('Validating', { value: valueSchema }),
    ts('Valid', { value: valueSchema }),
    ts('Invalid', { value: valueSchema, errors: S.NonEmptyArray(S.String) }),
  ])

// RULES DESCRIPTOR

/** A field's validation rules: the required message (if any), the list of rules,
 *  and an empty predicate. Produced by `makeRules`; consumed by the module's
 *  operations (`validate`, `validateAll`, `isValid`, `isRequired`). The fields
 *  are accessible but treating them as stable is discouraged. Prefer the
 *  operations so internal shape changes don't break callers. */
export type Rules<A> = Readonly<{
  requiredMessage: Option.Option<RuleMessage<A>>
  rules: ReadonlyArray<Rule<A>>
  isEmpty: (value: A) => boolean
}>

/** Options accepted by `makeRules`. */
export type MakeRulesOptions<A> = Readonly<{
  /** When present, the field is required: empty values become `Invalid`
   *  with the given message, and `isValid` requires `Valid`. Absent
   *  means the field is optional: empty values stay `NotValidated`, and
   *  `isValid` accepts `Valid` or `NotValidated`. */
  required?: RuleMessage<A>
  rules?: ReadonlyArray<Rule<A>>
  /** Predicate for what counts as "empty" for this field. Defaults to empty
   *  string and empty array; every other value is treated as present. Pass
   *  `(value) => value.trim() === ''` to treat whitespace-only input as empty. */
  isEmpty?: (value: A) => boolean
}>

const isEmptyValue = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return String.isEmpty(value)
  }
  if (Array.isArray(value)) {
    return Array.isReadonlyArrayEmpty(value)
  }
  return false
}

/** Creates a `Rules` bundle from options. The value type defaults to `string`;
 *  for other field values, annotate it: `makeRules<ReadonlyArray<Tag>>({ ... })`. */
export const makeRules = <A = string>(
  options: MakeRulesOptions<A> = {},
): Rules<A> => ({
  requiredMessage: Option.fromNullishOr(options.required),
  rules: options.rules ?? [],
  isEmpty: options.isEmpty ?? isEmptyValue,
})

// OPERATIONS

/** Validates a new value and returns the next field state.
 *
 *  For required fields, an empty value produces `Invalid` with the
 *  required message. For optional fields, an empty value produces
 *  `NotValidated`. Non-empty values run through the field's rules;
 *  the first failure becomes `Invalid`, otherwise the result is `Valid`. */
export const validate =
  <A>(rules: Rules<A>) =>
  (value: A): Field<A> => {
    if (rules.isEmpty(value)) {
      return Option.match(rules.requiredMessage, {
        onNone: () => NotValidated({ value }),
        onSome: message =>
          Invalid({ value, errors: [resolveMessage(message, value)] }),
      })
    }
    return pipe(
      rules.rules,
      Array.findFirst(([predicate]) => !predicate(value)),
      Option.match({
        onNone: () => Valid({ value }),
        onSome: ([, message]) =>
          Invalid({ value, errors: [resolveMessage(message, value)] }),
      }),
    )
  }

/** Like `validate` but collects every failing rule into the
 *  `Invalid` state's errors array instead of stopping at the first. */
export const validateAll =
  <A>(rules: Rules<A>) =>
  (value: A): Field<A> => {
    if (rules.isEmpty(value)) {
      return Option.match(rules.requiredMessage, {
        onNone: () => NotValidated({ value }),
        onSome: message =>
          Invalid({ value, errors: [resolveMessage(message, value)] }),
      })
    }
    return pipe(
      rules.rules,
      Array.filterMap(([predicate, message]) =>
        !predicate(value)
          ? Result.succeed(resolveMessage(message, value))
          : Result.failVoid,
      ),
      Array.match({
        onEmpty: () => Valid({ value }),
        onNonEmpty: errors => Invalid({ value, errors }),
      }),
    )
  }

/** Returns true when the field's current state is acceptable given its
 *  rules. For required fields, only `Valid` returns `true`. For optional
 *  fields, `Valid` or `NotValidated` both return `true`. `Invalid` and
 *  `Validating` always return `false`.
 *
 *  The name is distinct from the `Valid` tag on purpose: `isValid`
 *  answers "is this state an acceptable result?", which for an optional
 *  field is broader than `_tag === 'Valid'`. For pattern-matching on the
 *  state itself, check the `_tag` directly. */
export const isValid =
  <A>(rules: Rules<A>) =>
  (state: Field<A>): boolean => {
    if (state._tag === 'Invalid' || state._tag === 'Validating') {
      return false
    }
    if (Option.isSome(rules.requiredMessage)) {
      return state._tag === 'Valid'
    }
    return true
  }

/** Returns true when the rules mark the field as required. Useful for
 *  rendering affordances like a `*` next to required field labels. */
export const isRequired = <A>(rules: Rules<A>): boolean =>
  Option.isSome(rules.requiredMessage)

/** Returns true when the state's tag is `Invalid`. Tag-only predicate;
 *  unlike `!isValid(rules)(state)`, this does not treat `NotValidated`
 *  or `Validating` as errors. Use for "has the user seen a rule failure
 *  on this field?" affordances like red borders or per-step error
 *  indicators. */
export const isInvalid = (state: Field<unknown>): boolean =>
  state._tag === 'Invalid'

/** Returns true when every field is acceptable per its rules, by `isValid`.
 *  Each pair is a field's `[state, rules]`. The pairs in one call share a
 *  value type, so a call gates fields of a single type; for a form that mixes
 *  types, call `allValid` once per type and combine the results with `&&`.
 *  Use for form-level submit gates. */
export const allValid = <A>(
  pairs: ReadonlyArray<readonly [Field<A>, Rules<A>]>,
): boolean => Array.every(pairs, ([state, rules]) => isValid(rules)(state))

/** Returns true when any state in the input has tag `Invalid`. Use for
 *  "this step/section has errors" affordances, independent of rules. */
export const anyInvalid = (states: ReadonlyArray<Field<unknown>>): boolean =>
  Array.some(states, isInvalid)
