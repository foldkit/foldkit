import { Context } from 'effect'
import type { Layer } from 'effect'
import type { Update } from 'foldkit'

import type {
  ApplicationContract,
  ApplicationDispatch,
  ApplicationUpdateRequirements,
} from '../src/block.contract'
import type { Model } from '../src/model'
import type { Actual as Original } from './application.witness'
type IsNever<T> = [T] extends [never] ? true : false
type IsAny<T> = 0 extends 1 & T ? true : false
type Exact<A, B> =
  IsNever<A> extends true
    ? false
    : IsNever<B> extends true
      ? false
      : IsAny<A> extends true
        ? false
        : IsAny<B> extends true
          ? false
          : [A, B] extends [B, A]
            ? true
            : false

type Assert<Value extends true> = Value
class AddedService extends Context.Service<
  AddedService,
  { readonly token: string }
>()('DeclaredContract/AddedService') {}
type OriginalBlock = typeof Original

type AddedServiceBlock = Omit<OriginalBlock, 'EffectsLayer'> &
  Readonly<{
    EffectsLayer: Layer.Layer<
      Layer.Success<OriginalBlock['EffectsLayer']>,
      Layer.Error<OriginalBlock['EffectsLayer']>,
      Layer.Services<OriginalBlock['EffectsLayer']> | AddedService
    >
  }>
export type AddedServiceRejected = Assert<
  // @ts-expect-error An added constructor Service must invalidate the old contract.
  Exact<AddedServiceBlock, ApplicationContract>
>

type RefinedMessage =
  | Exclude<
      ApplicationDispatch['Type'],
      { readonly _tag: 'UpdatedNewsletterEmail' }
    >
  | (Extract<
      ApplicationDispatch['Type'],
      { readonly _tag: 'UpdatedNewsletterEmail' }
    > &
      Readonly<{ value: 'only-this-email' }>)
interface RefinedUpdate {
  (
    message: RefinedMessage,
  ): (
    model: typeof Model.Type,
  ) => Update.Return<
    typeof Model.Type,
    ApplicationDispatch['Type'],
    ApplicationUpdateRequirements
  >
  (
    model: typeof Model.Type,
    message: RefinedMessage,
  ): Update.Return<
    typeof Model.Type,
    ApplicationDispatch['Type'],
    ApplicationUpdateRequirements
  >
}
type RefinedPayloadBlock = Omit<OriginalBlock, 'update'> &
  Readonly<{ update: RefinedUpdate }>
export type RefinedPayloadRejected = Assert<
  // @ts-expect-error A refined input payload must invalidate the old contract.
  Exact<RefinedPayloadBlock, ApplicationContract>
>

type WithoutLast<Bindings> = Bindings extends readonly [...infer Rest, unknown]
  ? Readonly<Rest>
  : never
type RemovedBindingBlock = Omit<OriginalBlock, 'bindings'> &
  Readonly<{ bindings: WithoutLast<OriginalBlock['bindings']> }>
export type RemovedBindingRejected = Assert<
  // @ts-expect-error Removing UiPagesBinding must invalidate the exact graph contract.
  Exact<RemovedBindingBlock, ApplicationContract>
>

type ChangedErrorBlock = Omit<OriginalBlock, 'EffectsLayer'> &
  Readonly<{
    EffectsLayer: Layer.Layer<
      Layer.Success<OriginalBlock['EffectsLayer']>,
      'ChangedConstructorError',
      Layer.Services<OriginalBlock['EffectsLayer']>
    >
  }>
export type ChangedErrorRejected = Assert<
  // @ts-expect-error A new constructor error must invalidate the old contract.
  Exact<ChangedErrorBlock, ApplicationContract>
>

// @ts-expect-error never is assignable to an interface but is not an exact producer.
export type NeverProducerRejected = Assert<Exact<never, ApplicationContract>>
// @ts-expect-error A never contract cannot certify an implementation.
export type NeverContractRejected = Assert<Exact<OriginalBlock, never>>
// @ts-expect-error Even paired never sentinels must be rejected.
export type BothNeverRejected = Assert<Exact<never, never>>
