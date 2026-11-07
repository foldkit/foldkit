import { Schema } from 'effect'
import { Block } from 'foldkit'
import { Message } from './message'
export { Message } from './message'

const ParentKey = Symbol('UnifiedParent')
export const ParentBlock = Block.make('UnifiedParent', {
  key: ParentKey,
  Model: Schema.Struct({}),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const { makeStep, makeCommandsStep } = ParentBlock
export const ParentComposition = ParentBlock.makeComposition()
export const { makeView } = ParentComposition
