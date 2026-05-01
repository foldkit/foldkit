import {
  Array,
  Number as Number_,
  Option,
  Predicate,
  Schema as S,
  String,
  flow,
  pipe,
} from 'effect'

import { OptionExt } from '../effectExtensions/index.js'
import { ts } from '../schema/index.js'

// RULES + MESSAGES

/** An error message for a rule: either a static string, or a function that receives the invalid value. */
export type RuleMessage = string | ((value: string) => string)

/** A tuple of a predicate and error message used for field validation. */
export type Rule = readonly [Predicate.Predicate<string>, RuleMessage]

export const resolveMessage = (message: RuleMessage, value: string): string =>
  typeof message === 'string' ? message : message(value)

// STATE

/** The `NotValidated` state: user hasn't interacted yet. */
export const NotValidated = ts('NotValidated', { value: S.String })

/** The `Validating` state: async validation is in flight. */
export const Validating = ts('Validating', { value: S.String })

/** The `Valid` state: every rule passed. */
export const Valid = ts('Valid', { value: S.String })

/** The `Invalid` state: one or more rules failed. Carries a non-empty `errors` array. */
export const Invalid = ts('Invalid', {
  value: S.String,
  errors: S.NonEmptyArray(S.String),
})

/** The four-state union that represents a field's value in the Model. */
export const Field = S.Union([NotValidated, Validating, Valid, Invalid])
export type Field = typeof Field.Type

// RULES DESCRIPTOR

/** A field's validation rules: the required message (if any), the list of rules,
 *  and an empty predicate. Produced by `makeRules`; consumed by the module's
 *  operations (`validate`, `validateAll`, `isValid`, `isRequired`, `allValid`).
 *  The fields are accessible but treating them as stable is discouraged.
 *  Prefer the operations so internal shape changes don't break callers. */
export type Rules = Readonly<{
  requiredMessage: Option.Option<RuleMessage>
  rules: ReadonlyArray<Rule>
  isEmpty: (value: string) => boolean
}>

/** Options accepted by `makeRules`. */
export type MakeRulesOptions = Readonly<{
  /** When present, the field is required: empty values become `Invalid`
   *  with the given message, and `isValid` requires `Valid`. Absent
   *  means the field is optional: empty values stay `NotValidated`, and
   *  `isValid` accepts `Valid` or `NotValidated`. */
  required?: RuleMessage
  rules?: ReadonlyArray<Rule>
  /** Predicate for what counts as "empty" for this field. Defaults to
   *  `String.isEmpty` (the empty string only). Pass `(v) => v.trim() === ''`
   *  to treat whitespace-only input as empty. */
  isEmpty?: (value: string) => boolean
}>

export const makeRules = (options: MakeRulesOptions = {}): Rules => ({
  requiredMessage: Option.fromNullishOr(options.required),
  rules: options.rules ?? [],
  isEmpty: options.isEmpty ?? String.isEmpty,
})

// OPERATIONS

/** Validates a new value and returns the next field state.
 *
 *  For required fields, an empty value produces `Invalid` with the
 *  required message. For optional fields, an empty value produces
 *  `NotValidated`. Non-empty values run through the field's rules;
 *  the first failure becomes `Invalid`, otherwise the result is `Valid`. */
export const validate =
  (rules: Rules) =>
  (value: string): Field => {
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
  (rules: Rules) =>
  (value: string): Field => {
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
        OptionExt.when(!predicate(value), resolveMessage(message, value)),
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
  (rules: Rules) =>
  (state: Field): boolean => {
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
export const isRequired = (rules: Rules): boolean =>
  Option.isSome(rules.requiredMessage)

/** Returns true when the state's tag is `Invalid`. Tag-only predicate;
 *  unlike `!isValid(rules)(state)`, this does not treat `NotValidated`
 *  or `Validating` as errors. Use for "has the user seen a rule failure
 *  on this field?" affordances like red borders or per-step error
 *  indicators. */
export const isInvalid = (state: Field): boolean => state._tag === 'Invalid'

/** Returns true when every `(state, rules)` pair in the input is
 *  acceptable per `isValid`. Use for form-level submit gates. */
export const allValid = (
  pairs: ReadonlyArray<readonly [Field, Rules]>,
): boolean => Array.every(pairs, ([state, rules]) => isValid(rules)(state))

/** Returns true when any state in the input has tag `Invalid`. Use for
 *  "this step/section has errors" affordances, independent of rules. */
export const anyInvalid = (states: ReadonlyArray<Field>): boolean =>
  Array.some(states, isInvalid)

// STRING RULES

/** Creates a `Rule` that checks if a string meets a minimum length. */
export const minLength = (min: number, message?: RuleMessage): Rule => [
  flow(String.length, Number_.greaterThanOrEqualTo(min)),
  message ?? `Must be at least ${min} characters`,
]

/** Creates a `Rule` that checks if a string does not exceed a maximum length. */
export const maxLength = (max: number, message?: RuleMessage): Rule => [
  flow(String.length, Number_.lessThanOrEqualTo(max)),
  message ?? `Must be at most ${max} characters`,
]

/** Creates a `Rule` that checks if a string matches a regular expression. */
export const pattern = (
  regex: RegExp,
  message: RuleMessage = 'Invalid format',
): Rule => [flow(String.match(regex), Option.isSome), message]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Creates a `Rule` that checks if a string is a valid email format. */
export const email = (message: RuleMessage = 'Invalid email address'): Rule =>
  pattern(EMAIL_REGEX, message)

const STRICT_URL_REGEX = /^https?:\/\/.+/
const PERMISSIVE_URL_REGEX = /^(https?:\/\/)?\S+\.\S+$/

/** Creates a `Rule` that checks if a string is a valid URL format.
 *
 *  By default the URL must include an `http://` or `https://` protocol.
 *  Pass `{ requireProtocol: false }` to accept bare domains. */
export const url = (
  options: Readonly<{
    message?: RuleMessage
    requireProtocol?: boolean
  }> = {},
): Rule => {
  const { message = 'Invalid URL', requireProtocol = true } = options
  return pattern(
    requireProtocol ? STRICT_URL_REGEX : PERMISSIVE_URL_REGEX,
    message,
  )
}

/** Creates a `Rule` that checks if a string begins with a specified prefix. */
export const startsWith = (prefix: string, message?: RuleMessage): Rule => [
  flow(String.startsWith(prefix)),
  message ?? `Must start with ${prefix}`,
]

/** Creates a `Rule` that checks if a string ends with a specified suffix. */
export const endsWith = (suffix: string, message?: RuleMessage): Rule => [
  flow(String.endsWith(suffix)),
  message ?? `Must end with ${suffix}`,
]

/** Creates a `Rule` that checks if a string contains a specified substring. */
export const includes = (substring: string, message?: RuleMessage): Rule => [
  flow(String.includes(substring)),
  message ?? `Must contain ${substring}`,
]

/** Creates a `Rule` that checks if a string exactly matches an expected value. */
export const equals = (expected: string, message?: RuleMessage): Rule => [
  value => value === expected,
  message ?? `Must match ${expected}`,
]

/** Creates a `Rule` that checks if a string is one of a specified set of allowed values. */
export const oneOf = (
  values: ReadonlyArray<string>,
  message?: RuleMessage,
): Rule => {
  const joinedValues = Array.join(values, ', ')
  return [
    value => Array.contains(values, value),
    message ?? `Must be one of: ${joinedValues}`,
  ]
}
