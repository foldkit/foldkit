import { Effect, Layer, Schema } from 'effect'

import {
  Block,
  ParentBlock,
  Send,
} from '../contract-provisioning-proof/src/basic'
import {
  CodecChildBlock,
  Decode,
  Encode,
} from '../contract-provisioning-proof/src/context-and-codecs'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value

export const selectedParent = (isChildAvailable: boolean) =>
  ParentBlock.provide(isChildAvailable ? Block.layer : CodecChildBlock.layer)

export type SelectedRequirements = Layer.Services<
  ReturnType<typeof selectedParent>['layer']
>
export type MissingChildMustRemain = Assert<
  Equal<SelectedRequirements, Layer.Success<typeof Block.layer>>
>

export const erasedMissingImplementation = () =>
  Effect.runPromise(
    // @ts-expect-error A conditional implementation cannot satisfy its missing child provider.
    selectedParent(false).get.pipe(Effect.provide(selectedParent(false).layer)),
  )

export const compatibleParent = (isFresh: boolean) =>
  ParentBlock.provide(isFresh ? Layer.fresh(Block.layer) : Block.layer)

export type CompatibleParentIsClosed = Assert<
  Equal<Layer.Services<ReturnType<typeof compatibleParent>['layer']>, never>
>

const withDecode = Layer.merge(
  Block.layer,
  Layer.succeed(Decode, { prefix: 'A' }),
)
const withEncode = Layer.merge(
  Block.layer,
  Layer.succeed(Encode, { prefix: 'B' }),
)

export const commonOutputParent = (isDecoding: boolean) =>
  ParentBlock.provide(isDecoding ? withDecode : withEncode)

export type CommonOutputParentIsClosed = Assert<
  Equal<Layer.Services<ReturnType<typeof commonOutputParent>['layer']>, never>
>

class ProviderFailure extends Schema.TaggedError<ProviderFailure>()(
  'ProviderFailure',
  {},
) {}

const needsSend = Layer.effect(
  Decode,
  Effect.flatMap(Send, () => Effect.fail(new ProviderFailure())),
)

export const conditionalFailureParent = (isChildAvailable: boolean) =>
  ParentBlock.provide(isChildAvailable ? Block.layer : needsSend)

export type PossibleInputsRemain = Assert<
  Equal<
    Layer.Services<ReturnType<typeof conditionalFailureParent>['layer']>,
    Layer.Success<typeof Block.layer> | Send
  >
>
export type PossibleFailureRemains = Assert<
  Equal<
    Layer.Error<ReturnType<typeof conditionalFailureParent>['layer']>,
    ProviderFailure
  >
>
