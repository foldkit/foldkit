import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'

export const PlainKey = Symbol('PlainHostReadinessControl')
export const PlainDefinition = Block.makeDefinition(
  'PlainHostReadinessControl',
  {
    key: PlainKey,
    Model: Schema.Number,
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  },
)
const PlainComposition = PlainDefinition.makeComposition()
export const PlainBlock = PlainDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: PlainComposition.makeInit(() => ({ model: 0 })),
    update: PlainComposition.makeUpdate({}),
  }),
)
