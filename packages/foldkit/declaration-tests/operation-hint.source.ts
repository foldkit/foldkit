import type {
  IsSilentOperation,
  OperationEmission,
} from '../src/block/operationEmission.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

type Producer = () => Readonly<{ model: number }>
type HintKey = keyof OperationEmission<false>
type Hint<Value> = Readonly<Record<HintKey, Value>>

export type Silent = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<false>>, true>
>
export type Emitting = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<true>>, false>
>
export type Missing = Expect<Equal<IsSilentOperation<Producer>, false>>
export type Widened = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<boolean>>, false>
>
export type AnyProducer = Expect<Equal<IsSilentOperation<any>, false>>
export type UnknownProducer = Expect<Equal<IsSilentOperation<unknown>, false>>
export type NeverProducer = Expect<Equal<IsSilentOperation<never>, false>>
export type AnyHint = Expect<
  Equal<IsSilentOperation<Producer & Hint<any>>, false>
>
export type UnknownHint = Expect<
  Equal<IsSilentOperation<Producer & Hint<unknown>>, false>
>
export type NeverHint = Expect<
  Equal<IsSilentOperation<Producer & Hint<never>>, false>
>
export type AnyEmission = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<any>>, false>
>
export type UnknownEmission = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<unknown>>, false>
>
export type NeverEmission = Expect<
  Equal<IsSilentOperation<Producer & OperationEmission<never>>, false>
>
export type OptionalHint = Expect<
  Equal<IsSilentOperation<Producer & Partial<OperationEmission<false>>>, false>
>
export type UnionHint = Expect<
  Equal<
    IsSilentOperation<
      Producer & (OperationEmission<false> | OperationEmission<true>)
    >,
    false
  >
>
export type MissingUnionHint = Expect<
  Equal<
    IsSilentOperation<Producer | (Producer & OperationEmission<false>)>,
    false
  >
>

declare const silent: Producer & OperationEmission<false>
declare const emitting: Producer & OperationEmission<true>
declare const widened: Producer & OperationEmission<boolean>
const erased: Producer = silent
export type Erased = Expect<Equal<IsSilentOperation<typeof erased>, false>>

// @ts-expect-error An emitting compiler hint cannot be narrowed to silence.
const invalidEmitting: OperationEmission<false> = emitting
// @ts-expect-error A widened compiler hint cannot be narrowed to silence.
const invalidWidened: OperationEmission<false> = widened
void invalidEmitting
void invalidWidened
