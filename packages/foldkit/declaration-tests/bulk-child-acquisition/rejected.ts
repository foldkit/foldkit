import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'

import {
  ForeignComposition,
  Parent,
  ParentComposition,
  acquireParentChildren,
  parentInit,
  parentUpdate,
} from './accepted.js'

const RemovedInitKey = Symbol('BulkAcquisitionRemovedInit')
export const removedInitBlock = Block.make('BulkAcquisitionRemovedInit', {
  key: RemovedInitKey,
  Model: Schema.Null,
  Message: Schema.Never,
  isMessageFree: true,
  // @ts-expect-error The positional initializer contract is InitArgs; Init is not an alias.
  Init: Schema.Tuple([]),
})

export const invalidAcquisition = ParentComposition.acquireChildren(
  // @ts-expect-error Bulk acquisition takes its complete inventory from the Composition.
  ParentComposition.bindings,
)

// @ts-expect-error Every registered child connection remains required.
Parent.makeLayer(
  Effect.gen(function* () {
    const [first] = yield* acquireParentChildren()

    return {
      children: [first],
      init: parentInit,
      update: parentUpdate,
    }
  }),
)

// @ts-expect-error A foreign Composition cannot supply this parent's child inventory.
Parent.makeLayer(
  Effect.gen(function* () {
    const foreignChildren = yield* ForeignComposition.acquireChildren()

    return {
      children: foreignChildren,
      init: parentInit,
      update: parentUpdate,
    }
  }),
)

// @ts-expect-error A registered child Layer cannot be omitted from construction.
Parent.makeLayer(
  Effect.succeed({
    children: [],
    init: parentInit,
    update: parentUpdate,
  }),
)
