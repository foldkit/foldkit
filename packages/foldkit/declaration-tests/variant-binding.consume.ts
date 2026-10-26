import { Block } from 'foldkit'
import { makeVariantBinding } from 'foldkit/variantBinding'

import {
  Active,
  ChildBinding,
  ChildBlock,
  GatedBinding,
  ParentBlock,
  ParentDefinition,
} from './variant-binding.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export type ExactChild = Assert<
  Equal<Block.BlockOfBinding<typeof ChildBinding>, typeof ChildBlock>
>
export type ExactPlacement = Assert<
  Equal<typeof ChildBinding.placement, 'VariantActive'>
>
export type ExactCustomPlacement = Assert<
  Equal<typeof GatedBinding.placement, 'gatedActive'>
>
export const RecreatedBinding = makeVariantBinding(ParentDefinition, ChildBlock)
export const updated = ParentBlock.operations.setCount(
  Active.make({ _tag: 'Active', count: 0 }),
  4,
)
export const exactCount: number =
  updated.model._tag === 'Active' ? updated.model.count : 0
// @ts-expect-error Relocation preserves registration evidence on direct child operations.
ChildBinding.setCount(1)(Active.make({ _tag: 'Active', count: 0 }))
const model = Active.make({ _tag: 'Active', count: 0 })
// @ts-expect-error Relocation preserves the exact operation argument.
ParentBlock.operations.setCount(model, 'wrong')
