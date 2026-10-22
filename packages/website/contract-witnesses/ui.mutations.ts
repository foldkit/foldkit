import { Context } from 'effect'
import type { Layer } from 'effect'
import type { Update } from 'foldkit'

import type {
  UiContract,
  UiDispatch,
  UiUpdateRequirements,
} from '../src/page/ui/block.contract'
import type { Model } from '../src/page/ui/model'
import type { Actual as Original } from './ui.witness'
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
  Exact<AddedServiceBlock, UiContract>
>

type RefinedMessage =
  | Exclude<UiDispatch['Type'], { readonly _tag: 'UpdatedInputDemoValue' }>
  | (Extract<UiDispatch['Type'], { readonly _tag: 'UpdatedInputDemoValue' }> &
      Readonly<{ value: 'only-this-email' }>)
interface RefinedUpdate {
  (
    message: RefinedMessage,
  ): (
    model: typeof Model.Type,
  ) => Update.Return<
    typeof Model.Type,
    UiDispatch['Type'],
    UiUpdateRequirements
  >
  (
    model: typeof Model.Type,
    message: RefinedMessage,
  ): Update.Return<typeof Model.Type, UiDispatch['Type'], UiUpdateRequirements>
}
type RefinedPayloadBlock = Omit<OriginalBlock, 'update'> &
  Readonly<{ update: RefinedUpdate }>
export type RefinedPayloadRejected = Assert<
  // @ts-expect-error A refined input payload must invalidate the old contract.
  Exact<RefinedPayloadBlock, UiContract>
>

type WithoutLast<Bindings> = Bindings extends readonly [...infer Rest, unknown]
  ? Readonly<Rest>
  : never
type RemovedBindingBlock = Omit<OriginalBlock, 'bindings'> &
  Readonly<{ bindings: WithoutLast<OriginalBlock['bindings']> }>
export type RemovedBindingRejected = Assert<
  // @ts-expect-error Removing VirtualListVariableDemoBinding must invalidate the exact graph contract.
  Exact<RemovedBindingBlock, UiContract>
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
  Exact<ChangedErrorBlock, UiContract>
>

// @ts-expect-error never is assignable to an interface but is not an exact producer.
export type NeverProducerRejected = Assert<Exact<never, UiContract>>
// @ts-expect-error A never contract cannot certify an implementation.
export type NeverContractRejected = Assert<Exact<OriginalBlock, never>>
// @ts-expect-error Even paired never sentinels must be rejected.
export type BothNeverRejected = Assert<Exact<never, never>>
