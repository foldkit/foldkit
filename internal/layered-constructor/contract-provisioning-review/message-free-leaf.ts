import { Effect, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'

export const MessageFreeLeafContractReviewKey = Symbol(
  'MessageFreeLeafContractReview',
)
const Definition = Contracted.makeDefinition('MessageFreeLeafContractReview', {
  key: MessageFreeLeafContractReviewKey,
  Model: Schema.Struct({}),
  Message: Schema.Never,
  Init: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const constructor = Effect.succeed({
  children: [],
  init: Composition.makeInit(() => ({ model: {} })),
  update: Composition.makeUpdate({}),
})

// @ts-expect-error A genuinely empty dispatch Schema cannot satisfy the current nonempty contract fact.
export const RejectedMessageFreeLeaf = Definition.makeBlock(constructor)
