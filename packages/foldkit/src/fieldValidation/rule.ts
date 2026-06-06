import {
  Array,
  Number as Number_,
  Option,
  Predicate,
  Schema as S,
  String,
  flow,
} from 'effect'

// RULES + MESSAGES

/** An error message for a rule: either a static string, or a function that receives the invalid value. */
export type RuleMessage<A> = string | ((value: A) => string)

/** A tuple of a predicate and error message used for field validation. */
export type Rule<A> = readonly [Predicate.Predicate<A>, RuleMessage<A>]

/** Resolves a `RuleMessage` to a concrete string, applying it to the value when the message is a function. */
export const resolveMessage = <A>(message: RuleMessage<A>, value: A): string =>
  typeof message === 'string' ? message : message(value)

// STRING RULES

/** Creates a `Rule` that checks if a string meets a minimum length. */
export const minLength = (
  min: number,
  message?: RuleMessage<string>,
): Rule<string> => [
  flow(String.length, Number_.isGreaterThanOrEqualTo(min)),
  message ?? `Must be at least ${min} characters`,
]

/** Creates a `Rule` that checks if a string does not exceed a maximum length. */
export const maxLength = (
  max: number,
  message?: RuleMessage<string>,
): Rule<string> => [
  flow(String.length, Number_.isLessThanOrEqualTo(max)),
  message ?? `Must be at most ${max} characters`,
]

/** Creates a `Rule` that checks if a string matches a regular expression. */
export const pattern = (
  regex: RegExp,
  message: RuleMessage<string> = 'Invalid format',
): Rule<string> => [flow(String.match(regex), Option.isSome), message]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Creates a `Rule` that checks if a string is a valid email format. */
export const email = (
  message: RuleMessage<string> = 'Invalid email address',
): Rule<string> => pattern(EMAIL_REGEX, message)

const STRICT_URL_REGEX = /^https?:\/\/.+/
const PERMISSIVE_URL_REGEX = /^(https?:\/\/)?\S+\.\S+$/

/** Creates a `Rule` that checks if a string is a valid URL format.
 *
 *  By default the URL must include an `http://` or `https://` protocol.
 *  Pass `{ requireProtocol: false }` to accept bare domains. */
export const url = (
  options: Readonly<{
    message?: RuleMessage<string>
    requireProtocol?: boolean
  }> = {},
): Rule<string> => {
  const { message = 'Invalid URL', requireProtocol = true } = options
  return pattern(
    requireProtocol ? STRICT_URL_REGEX : PERMISSIVE_URL_REGEX,
    message,
  )
}

/** Creates a `Rule` that checks if a string begins with a specified prefix. */
export const startsWith = (
  prefix: string,
  message?: RuleMessage<string>,
): Rule<string> => [
  String.startsWith(prefix),
  message ?? `Must start with ${prefix}`,
]

/** Creates a `Rule` that checks if a string ends with a specified suffix. */
export const endsWith = (
  suffix: string,
  message?: RuleMessage<string>,
): Rule<string> => [
  String.endsWith(suffix),
  message ?? `Must end with ${suffix}`,
]

/** Creates a `Rule` that checks if a string contains a specified substring. */
export const includes = (
  substring: string,
  message?: RuleMessage<string>,
): Rule<string> => [
  String.includes(substring),
  message ?? `Must contain ${substring}`,
]

/** Creates a `Rule` that checks if a string exactly matches an expected value. */
export const equals = (
  expected: string,
  message?: RuleMessage<string>,
): Rule<string> => [
  value => value === expected,
  message ?? `Must match ${expected}`,
]

/** Creates a `Rule` that checks if a string is one of a specified set of allowed values. */
export const oneOf = (
  values: ReadonlyArray<string>,
  message?: RuleMessage<string>,
): Rule<string> => {
  const joinedValues = Array.join(values, ', ')
  return [
    value => Array.contains(values, value),
    message ?? `Must be one of: ${joinedValues}`,
  ]
}

// ARRAY RULES

/** Creates a `Rule` that checks an array holds at least `min` items. */
export const minItems = (
  min: number,
  message?: RuleMessage<ReadonlyArray<unknown>>,
): Rule<ReadonlyArray<unknown>> => [
  flow(Array.length, Number_.isGreaterThanOrEqualTo(min)),
  message ?? `Must select at least ${min}`,
]

/** Creates a `Rule` that checks an array holds at most `max` items. */
export const maxItems = (
  max: number,
  message?: RuleMessage<ReadonlyArray<unknown>>,
): Rule<ReadonlyArray<unknown>> => [
  flow(Array.length, Number_.isLessThanOrEqualTo(max)),
  message ?? `Must select at most ${max}`,
]

// SCHEMA RULES

/** Creates a `Rule` that passes when the value decodes through `schema`.
 *
 *  Use it to reuse a Schema you already maintain (a domain codec, a refined or
 *  branded type you decode to on submit) as a field rule, so the rule stays in
 *  sync with the schema instead of duplicating its logic. It does nothing a
 *  custom rule can't, so prefer the dedicated rules for plain checks. Decoding
 *  is synchronous: the schema must decode without running an effect. */
export const fromSchema = <A, I>(
  schema: S.Codec<A, I>,
  message: RuleMessage<I>,
): Rule<I> => [flow(S.decodeOption(schema), Option.isSome), message]
