import type { Block } from 'foldkit'

import {
  ChildBlock,
  ChildId,
  ContextCustomChildrenBinding,
  ParentModel,
  makeDetachedCustomKeyedBinding,
  makeDetachedRecordBinding,
  makeDetachedRequiredBinding,
} from './binding-relationships.accepted.js'
import type { Assert, Equal } from './from-assembly.assertions.js'

export const ImportedRequiredBinding = makeDetachedRequiredBinding(ChildBlock, {
  field: 'requiredChild',
  placement: 'importedRequiredChild',
  init: false,
})
export const ImportedRecordBinding = makeDetachedRecordBinding(ChildBlock, {
  field: 'childrenById',
  placement: 'importedChildrenById',
})
export const ImportedCustomKeyedBinding = makeDetachedCustomKeyedBinding(
  ChildBlock,
  {
    placement: 'importedCustomChildren',
    readAll: model => model.customChildren,
    key: entry => entry.id,
    keySchema: ChildId,
    read: entry => entry.child,
    writeAt: (model, _key, _child) => model,
  },
)

export type ExactImportedRequiredPlacement = Assert<
  Equal<typeof ImportedRequiredBinding.placement, 'importedRequiredChild'>
>
export type ExactImportedRecordKey = Assert<
  Equal<Parameters<typeof ImportedRecordBinding.fold>[1], typeof ChildId.Type>
>
export type ExactImportedCustomParent = Assert<
  Equal<
    Parameters<typeof ImportedCustomKeyedBinding.fold>[0],
    typeof ParentModel.Type &
      import('foldkit').Update.GraphCapability<
        typeof ParentModel.Type,
        Block.RequirementOfBinding<typeof ImportedCustomKeyedBinding>
      >
  >
>

ImportedRecordBinding.updateLabel(ChildId.make('first'), { label: 'next' })
ContextCustomChildrenBinding.updateLabel(
  ChildId.make('first'),
  {
    label: 'next',
  },
  { prefix: 'consumer' },
)
// @ts-expect-error Relocated custom-keyed operations retain their required update context.
ContextCustomChildrenBinding.updateLabel(ChildId.make('first'), {
  label: 'next',
})
ContextCustomChildrenBinding.updateLabel(
  ChildId.make('first'),
  { label: 'next' },
  // @ts-expect-error Relocated custom-keyed operations retain the exact update context.
  { prefix: 1 },
)
// @ts-expect-error Relocated Record Bindings retain their branded key.
ImportedRecordBinding.updateLabel('first', { label: 'next' })
// @ts-expect-error Detached required-field constructors retain the parent field contract.
makeDetachedRequiredBinding(ChildBlock, { field: 'maybeChild' })
