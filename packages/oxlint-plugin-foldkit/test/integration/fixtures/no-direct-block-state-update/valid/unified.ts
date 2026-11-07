import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'

const ChildKey = Symbol('UnifiedChild')
const ApplicationKey = Symbol('UnifiedApplication')
const ChildBlock = Block.make('UnifiedChild', {
  key: ChildKey,
  Model: Schema.Struct({ title: Schema.String }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({ RequestedSave: {} }),
  InitArgs: Schema.Tuple([]),
})
const ApplicationBlock = Block.make('UnifiedApplication', {
  key: ApplicationKey,
  Model: Schema.Struct({ child: ChildBlock.Model }),
  Message: defineMessageUnion({ ClickedSave: {} }),
  InitArgs: Schema.Tuple([]),
})
const ChildBinding = ApplicationBlock.makeRequiredFieldBinding(ChildBlock, { field: 'child' })
const ApplicationComposition = ApplicationBlock.makeComposition({ bindings: [ChildBinding] })
export const update = ApplicationComposition.makeUpdate({ ClickedSave: ChildBinding.requestSave() })
