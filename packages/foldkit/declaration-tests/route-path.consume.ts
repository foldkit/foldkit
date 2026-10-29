import type {
  ApplicationRoute,
  PathFailure,
  parsePath,
  parsePersonOrFailure,
  parsePersonPath,
  parsed,
  parsedPerson,
} from './route-path.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value

export type ExactPathResult = Expect<
  Equal<typeof parsed, typeof ApplicationRoute.Type>
>
export type ExactPathInput = Expect<
  Equal<Parameters<typeof parsePath>, [path: string]>
>
export type ExactPersonResult = Expect<
  Equal<
    typeof parsedPerson,
    typeof ApplicationRoute.Person.Type | typeof ApplicationRoute.NotFound.Type
  >
>
export type ExactPersonParser = Expect<
  Equal<ReturnType<typeof parsePersonPath>, typeof parsedPerson>
>
export type ExactCustomFallback = Expect<
  Equal<
    ReturnType<typeof parsePersonOrFailure>,
    typeof ApplicationRoute.Person.Type | typeof PathFailure.Type
  >
>
