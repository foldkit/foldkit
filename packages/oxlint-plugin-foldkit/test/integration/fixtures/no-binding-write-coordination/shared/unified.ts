import { Schema } from 'effect'
import { Block } from 'foldkit'

const ChildKey = Symbol('UnifiedWriterChild')
const ParentKey = Symbol('UnifiedWriterParent')
export const ChildBlock = Block.make('UnifiedWriterChild', {
  key: ChildKey,
  Model: Schema.Struct({ label: Schema.String }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
export const ParentBlock = Block.make('UnifiedWriterParent', {
  key: ParentKey,
  Model: Schema.Struct({ child: ChildBlock.Model, announcement: Schema.String }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
export const { makeCustomBinding } = ParentBlock
