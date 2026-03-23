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

import { CallableTaggedStruct, ts } from '../schema'

/** A tagged union of field states for use with form validation. */
export type Field<A, I> = Readonly<{
  NotValidated: CallableTaggedStruct<'NotValidated', { value: S.Schema<A, I> }>
  Validating: CallableTaggedStruct<'Validating', { value: S.Schema<A, I> }>
  Valid: CallableTaggedStruct<'Valid', { value: S.Schema<A, I> }>
  Invalid: CallableTaggedStruct<
    'Invalid',
    { value: S.Schema<A, I>; errors: S.NonEmptyArray<typeof S.String> }
  >
  Union: S.Union<
    [
      CallableTaggedStruct<'NotValidated', { value: S.Schema<A, I> }>,
      CallableTaggedStruct<'Validating', { value: S.Schema<A, I> }>,
      CallableTaggedStruct<'Valid', { value: S.Schema<A, I> }>,
      CallableTaggedStruct<
        'Invalid',
        { value: S.Schema<A, I>; errors: S.NonEmptyArray<typeof S.String> }
      >,
    ]
  >
  validate: (fieldValidations: ReadonlyArray<Validation<A>>) => (
    fieldValue: A,
  ) =>
    | Readonly<{ _tag: 'Valid'; value: A }>
    | Readonly<{
        _tag: 'Invalid'
        value: A
        errors: readonly [string, ...Array<string>]
      }>
  validateAll: (fieldValidations: ReadonlyArray<Validation<A>>) => (
    fieldValue: A,
  ) =>
    | Readonly<{ _tag: 'Valid'; value: A }>
    | Readonly<{
        _tag: 'Invalid'
        value: A
        errors: readonly [string, ...Array<string>]
      }>
}>

/** Creates a tagged union of field states (`NotValidated`, `Validating`, `Valid`, `Invalid`) for a given value schema. */
export const makeField = <A, I>(value: S.Schema<A, I>): Field<A, I> => {
  const NotValidated = ts('NotValidated', { value })
  const Validating = ts('Validating', { value })
  const Valid = ts('Valid', { value })
  const Invalid = ts('Invalid', { value, errors: S.NonEmptyArray(S.String) })

  const validate =
    (fieldValidations: ReadonlyArray<Validation<A>>) => (fieldValue: A) =>
      pipe(
        fieldValidations,
        Array.findFirst(([predicate]) => !predicate(fieldValue)),
        Option.match({
          onNone: () => Valid({ value: fieldValue }),
          onSome: ([, message]) =>
            Invalid({
              value: fieldValue,
              errors: [resolveMessage(message, fieldValue)],
            }),
        }),
      )

  const validateAll =
    (fieldValidations: ReadonlyArray<Validation<A>>) => (fieldValue: A) =>
      pipe(
        fieldValidations,
        Array.filterMap(([predicate, message]) =>
          predicate(fieldValue)
            ? Option.none()
            : Option.some(resolveMessage(message, fieldValue)),
        ),
        Array.match({
          onEmpty: () => Valid({ value: fieldValue }),
          onNonEmpty: errors => Invalid({ value: fieldValue, errors }),
        }),
      )

  return {
    NotValidated,
    Validating,
    Valid,
    Invalid,
    Union: S.Union(NotValidated, Validating, Valid, Invalid),
    validate,
    validateAll,
  }
}

/** An error message for a validation rule — either a static string or a function that receives the invalid value. */
export type ValidationMessage<T> = string | ((value: T) => string)

/** A tuple of a predicate and error message used for field validation. */
export type Validation<T> = [Predicate.Predicate<T>, ValidationMessage<T>]

export const resolveMessage = <T>(
  message: ValidationMessage<T>,
  value: T,
): string => (typeof message === 'string' ? message : message(value))

// STRING VALIDATORS

/** Creates a `Validation` that checks if a string is non-empty. */
export const required = (
  message: ValidationMessage<string> = 'Required',
): Validation<string> => [String.isNonEmpty, message]

/** Creates a `Validation` that checks if a string meets a minimum length. */
export const minLength = (
  min: number,
  message?: ValidationMessage<string>,
): Validation<string> => [
  flow(String.length, Number_.greaterThanOrEqualTo(min)),
  message ?? `Must be at least ${min} characters`,
]

/** Creates a `Validation` that checks if a string does not exceed a maximum length. */
export const maxLength = (
  max: number,
  message?: ValidationMessage<string>,
): Validation<string> => [
  flow(String.length, Number_.lessThanOrEqualTo(max)),
  message ?? `Must be at most ${max} characters`,
]

/** Creates a `Validation` that checks if a string matches a regular expression. */
export const pattern = (
  regex: RegExp,
  message: ValidationMessage<string> = 'Invalid format',
): Validation<string> => [flow(String.match(regex), Option.isSome), message]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Creates a `Validation` that checks if a string is a valid email format. */
export const email = (
  message: ValidationMessage<string> = 'Invalid email address',
): Validation<string> => pattern(EMAIL_REGEX, message)

const URL_REGEX = /^https?:\/\/.+/

/** Creates a `Validation` that checks if a string is a valid URL format. */
export const url = (
  message: ValidationMessage<string> = 'Invalid URL',
): Validation<string> => pattern(URL_REGEX, message)

/** Creates a `Validation` that checks if a string begins with a specified prefix. */
export const startsWith = (
  prefix: string,
  message?: ValidationMessage<string>,
): Validation<string> => [
  flow(String.startsWith(prefix)),
  message ?? `Must start with ${prefix}`,
]

/** Creates a `Validation` that checks if a string ends with a specified suffix. */
export const endsWith = (
  suffix: string,
  message?: ValidationMessage<string>,
): Validation<string> => [
  flow(String.endsWith(suffix)),
  message ?? `Must end with ${suffix}`,
]

/** Creates a `Validation` that checks if a string contains a specified substring. */
export const includes = (
  substring: string,
  message?: ValidationMessage<string>,
): Validation<string> => [
  flow(String.includes(substring)),
  message ?? `Must contain ${substring}`,
]

/** Creates a `Validation` that checks if a string exactly matches an expected value. */
export const equals = (
  expected: string,
  message?: ValidationMessage<string>,
): Validation<string> => [
  value => value === expected,
  message ?? `Must match ${expected}`,
]

// NUMBER VALIDATORS

/** Creates a `Validation` that checks if a number is greater than or equal to a minimum value. */
export const min = (
  num: number,
  message?: ValidationMessage<number>,
): Validation<number> => [
  Number_.greaterThanOrEqualTo(num),
  message ?? `Must be at least ${num}`,
]

/** Creates a `Validation` that checks if a number is less than or equal to a maximum value. */
export const max = (
  num: number,
  message?: ValidationMessage<number>,
): Validation<number> => [
  Number_.lessThanOrEqualTo(num),
  message ?? `Must be at most ${num}`,
]

/** Creates a `Validation` that checks if a number falls within a specified inclusive range. */
export const between = (
  min: number,
  max: number,
  message?: ValidationMessage<number>,
): Validation<number> => [
  Predicate.and(
    Number_.greaterThanOrEqualTo(min),
    Number_.lessThanOrEqualTo(max),
  ),
  message ?? `Must be between ${min} and ${max}`,
]

/** Creates a `Validation` that checks if a number is greater than zero. */
export const positive = (
  message: ValidationMessage<number> = 'Must be positive',
): Validation<number> => [Number_.greaterThan(0), message]

/** Creates a `Validation` that checks if a number is zero or greater. */
export const nonNegative = (
  message: ValidationMessage<number> = 'Must be non-negative',
): Validation<number> => [Number_.greaterThanOrEqualTo(0), message]

/** Creates a `Validation` that checks if a number is a whole number (integer). */
export const integer = (
  message: ValidationMessage<number> = 'Must be a whole number',
): Validation<number> => [value => Number.isInteger(value), message]

// GENERIC VALIDATORS

/** Creates a `Validation` that checks if a string is one of a specified set of allowed values. */
export const oneOf = (
  values: ReadonlyArray<string>,
  message?: ValidationMessage<string>,
): Validation<string> => {
  const joinedValues = Array.join(values, ', ')
  return [
    value => Array.contains(values, value),
    message ?? `Must be one of: ${joinedValues}`,
  ]
}
