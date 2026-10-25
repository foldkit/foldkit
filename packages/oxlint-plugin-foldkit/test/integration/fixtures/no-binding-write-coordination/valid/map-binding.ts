import { Schema } from 'effect'
import { Block } from 'foldkit'
import { makeMapBinding as bindMap } from 'foldkit/mapBinding'
import * as MapBinding from 'foldkit/mapBinding'

import { ChildBlock, ChildModel } from '../shared/definition'

const ParentDefinition = Block.makeDefinition('MapWriterParent', {
  Model: Schema.Struct({
    childrenById: Schema.Record(Schema.String, ChildModel),
    moreChildrenById: Schema.Record(Schema.String, ChildModel),
  }),
  Message: Schema.Never,
})

bindMap(ParentDefinition, ChildBlock, { field: 'childrenById' })
MapBinding.makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'moreChildrenById',
})

const makeMapBinding = (
  _parent: unknown,
  _child: unknown,
  config: unknown,
) => config

makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'childrenById',
  write: 'unrelated',
})

export const callShadowed = (
  makeMapBinding: (...args: ReadonlyArray<unknown>) => unknown,
) => makeMapBinding(ParentDefinition, ChildBlock, { write: 'shadowed' })
