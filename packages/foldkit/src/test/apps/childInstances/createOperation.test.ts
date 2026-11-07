import { Effect, Schema } from 'effect'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { makeDefinition } from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import * as Story from '../../../story/public.js'

const CreatorModel = Schema.Struct({ creations: Schema.Number })
const CreatorMessage = defineMessageUnion({ RequestedCreate: {} })
const CreatorKey = Symbol('OccurrenceOperationCreator')
const CreatorDefinition = makeDefinition('OccurrenceOperationCreator', {
  key: CreatorKey,
  Model: CreatorModel,
  Message: CreatorMessage,
  InitArgs: Schema.Tuple([]),
  operations: { create: CreatorMessage.RequestedCreate },
})
const CreatorBlock = CreatorDefinition.contract
const CreatorComposition = CreatorDefinition.makeComposition()
const creatorLayer = CreatorDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: CreatorComposition.makeInit(() => ({ model: { creations: 0 } })),
    update: CreatorComposition.makeUpdate({
      RequestedCreate: CreatorDefinition.makeFieldsStep(() => ({
        creations: count => count + 1,
      })),
    }),
  }),
).layer
const Model = Schema.Struct({ creator: CreatorBlock.Model })
const Message = defineMessageUnion({ ClickedCreate: {} })
const ApplicationKey = Symbol('OccurrenceOperationParent')
const ApplicationDefinition = makeDefinition('OccurrenceOperationParent', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
const CreatorBinding = ApplicationDefinition.makeRequiredFieldBinding(
  CreatorBlock,
  {
    field: 'creator',
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [CreatorBinding],
})
const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const creator = yield* CreatorBinding

    return {
      children: [creator],
      init: ApplicationComposition.makeInit(() => ({ model: {} })),
      update: ApplicationComposition.makeUpdate({
        ClickedCreate: CreatorBinding.create(),
      }),
    }
  }),
).provide(creatorLayer)

it.effect(
  'preserves an ordinary child operation named create outside Instance storage',
  () =>
    Story.story(
      ApplicationBlock,
      Story.init(),
      Story.message(Message.ClickedCreate()),
      Story.model(model => expect(model.creator.creations).toBe(1)),
    ),
)
