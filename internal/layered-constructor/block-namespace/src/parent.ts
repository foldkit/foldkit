import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { ChildBlock } from './child/block.js'
import { ChildContract } from './child/definition.js'

const Model = Schema.Struct({
  child: ChildContract.Model,
  lastCount: Schema.Number,
})
export const Message = defineMessageUnion({ ClickedResetCount: {} })
export const ParentKey = Symbol('CanonicalNamespaceParent')
export const ParentDefinition = Block.makeDefinition(
  'CanonicalNamespaceParent',
  {
    key: ParentKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
export const ChildBinding = ParentDefinition.makeBinding(ChildContract, {
  field: 'child',
  init: { contextToArgs: () => [1] },
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildContract, {
    ChangedCount: ({ count }) =>
      ParentDefinition.makeFieldsStep(() => ({ lastCount: () => count })),
  }),
})
export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export type ParentViewBuilder = Block.ViewBuilderFor<typeof ParentComposition>
export const resetCount = ChildBinding.setCount({ value: 0 })
const init = ParentComposition.makeInit(() => ({ model: { lastCount: 1 } }))
const update = ParentComposition.makeUpdate({ ClickedResetCount: resetCount })
const view = ParentComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        ChildBinding.embedView({
          slotId: 'counter',
          model: model.child,
          viewInputs: { toLabel: count => `Count ${count}` },
        }),
      ),
    ],
  ),
)

export const ParentBlock = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return { children: [child], init, update, view }
  }),
).provide(ChildBlock.layer)
