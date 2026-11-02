import { Effect, Schema } from 'effect'
import { Socket } from 'effect/socket'
import type * as Block from 'foldkit/block'
import * as Contracted from 'foldkit/experimental/contracted'
import * as Layered from 'foldkit/experimental/layered'
import { defineMessageUnion } from 'foldkit/message'

import { ChatRoomBlock } from '../contract-provisioning/src/chatRoom/block'
import { ChatRoomContract } from '../contract-provisioning/src/chatRoom/definition'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value

const Model = Schema.Struct({
  general: ChatRoomContract.Model,
  random: ChatRoomContract.Model,
})
const Message = defineMessageUnion({ ClickedRefresh: {} })
const config = {
  Model,
  Message,
  Init: Schema.Tuple([]),
  effects: {
    services: [Socket.WebSocketConstructor],
  },
}
export const ReviewAncestorResourceContractKey = Symbol(
  'ReviewAncestorResourceContract',
)
const Definition = Contracted.makeDefinition('ReviewAncestorResourceContract', {
  ...config,
  key: ReviewAncestorResourceContractKey,
})
const GeneralBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'general',
  init: {
    contextToArgs: () => [{ title: 'General', inputId: 'general-message' }],
  },
})
const RandomBinding = Definition.makeBinding(ChatRoomContract, {
  field: 'random',
  init: {
    contextToArgs: () => [{ title: 'Random', inputId: 'random-message' }],
  },
})
const Composition = Definition.makeComposition({
  bindings: [GeneralBinding, RandomBinding],
})
const init = Composition.makeInit(() => ({ model: {} }))
const update = Composition.makeUpdate({
  ClickedRefresh: Definition.makeNoopStep(),
})
const constructor = Effect.gen(function* () {
  const general = yield* GeneralBinding
  const random = yield* RandomBinding

  return { children: [general, random], init, update }
})

export const AncestorBlock = Definition.makeBlock(constructor)

const InferredDefinition = Layered.makeDefinition(
  'ReviewInferredAncestorResources',
  {
    Model,
    Message,
  },
)
const InferredGeneralBinding = InferredDefinition.makeBinding(ChatRoomBlock, {
  field: 'general',
  init: {
    contextToArgs: () => [{ title: 'General', inputId: 'general-message' }],
  },
})
const InferredRandomBinding = InferredDefinition.makeBinding(ChatRoomBlock, {
  field: 'random',
  init: {
    contextToArgs: () => [{ title: 'Random', inputId: 'random-message' }],
  },
})
const InferredComposition = InferredDefinition.makeComposition({
  bindings: [InferredGeneralBinding, InferredRandomBinding],
})

export const InferredAncestor = InferredDefinition.makeBlock(
  Effect.gen(function* () {
    const general = yield* InferredGeneralBinding
    const random = yield* InferredRandomBinding

    return {
      children: [general, random],
      init: InferredComposition.makeInit(() => ({ model: {} })),
      update: InferredComposition.makeUpdate({
        ClickedRefresh: InferredDefinition.makeNoopStep(),
      }),
    }
  }),
)

export type ExpectedAncestorResources =
  | Block.Qualify<
      'general',
      Contracted.RuntimeCapability<typeof ChatRoomContract.owner>
    >
  | Block.Qualify<
      'random',
      Contracted.RuntimeCapability<typeof ChatRoomContract.owner>
    >
export type InferredAncestorResourcesAreExact = Assert<
  Equal<
    Layered.FactsOf<typeof InferredAncestor>['runtimeServices'],
    ExpectedAncestorResources
  >
>
export type DeclaredAncestorOwnsOpaqueExecution = Assert<
  Equal<
    Contracted.FactsOf<typeof AncestorBlock>['runtimeServices'],
    Contracted.RuntimeCapability<typeof Definition.owner>
  >
>
