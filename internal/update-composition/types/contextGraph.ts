import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import { makeComposableUpdates } from './authoring.js'
import { Message, OutMessage } from './domain.js'
import { ChildBlock, ParentModel } from './graph.js'

export const ContextParentKey = Symbol('ContextParent')
export const ContextParentDefinition = Block.makeDefinition('ContextParent', {
  key: ContextParentKey,
  Model: ParentModel,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
  Context:
    Block.makeInputContract<
      readonly [
        timestamp: number,
        source?: string,
        ...trail: ReadonlyArray<string>,
      ]
    >(),
})

export const ContextChildBinding = ContextParentDefinition.makeBinding(
  ChildBlock,
  {
    field: 'child',
  },
).withOutMessagePolicy({
  fold: ContextParentDefinition.makeOutMessageFold(ChildBlock, {
    Notified: ContextParentDefinition.makeNoopStep,
  }),
})

export const ContextParentComposition = ContextParentDefinition.makeComposition(
  {
    bindings: [ContextChildBinding],
  },
)
export const updates = makeComposableUpdates(ContextParentComposition)

export const applyContextualConditional = updates.each(
  (model, _message, { before }, timestamp, source = 'Local', ...trail) =>
    timestamp > before.count && source !== trail.join('/')
      ? ContextChildBinding.requestPing()(model)
      : ContextParentDefinition.makeNoopStep()(model),
)
