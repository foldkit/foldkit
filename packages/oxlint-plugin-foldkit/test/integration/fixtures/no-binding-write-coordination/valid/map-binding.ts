import { Option, Schema } from 'effect'
import { modifyFields } from 'foldkit/struct'
import * as Helpers from '../shared/definition'
import * as UnrelatedHelpers from '../shared/unrelated'
import { Block } from 'foldkit'

import { ChildBlock, ChildModel } from '../shared/definition'

const ParentDefinition = Block.makeDefinition('MapWriterParent', {
  Model: Schema.Struct({
    childrenById: Schema.Record(Schema.String, ChildModel),
    moreChildrenById: Schema.Record(Schema.String, ChildModel),
  }),
  Message: Schema.Never,
})

const { makeMapBinding: bindMap } = ParentDefinition
bindMap(ChildBlock, { field: 'childrenById' })
ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'moreChildrenById',
})

const makeMapBinding = (
  _child: unknown,
  config: unknown,
) => config

makeMapBinding(ChildBlock, {
  field: 'childrenById',
  write: 'unrelated',
})

export const callShadowed = (
  makeMapBinding: (...args: ReadonlyArray<unknown>) => unknown,
) => makeMapBinding(ChildBlock, { write: 'shadowed' })

const unrelatedDefinition = {
  makeMapBinding: (_child: unknown, config: unknown) => config,
}
const { makeMapBinding: unrelatedBindMap } = unrelatedDefinition
unrelatedDefinition.makeMapBinding(ChildBlock, { write: 'unrelated method' })
unrelatedBindMap(ChildBlock, { write: 'unrelated extracted method' })

const unrelatedNamespaceAlias = UnrelatedHelpers
const unrelatedNamespaceAliasAgain = unrelatedNamespaceAlias
const unrelatedMethodAlias = unrelatedNamespaceAliasAgain.makeMapBinding
const { makeMapBinding: unrelatedDestructuredMap } = unrelatedNamespaceAliasAgain
const writer = {
  field: 'child',
  read: (model: typeof Helpers.ParentDefinition.Model.Type) => Option.some(model.child),
  write: (model: typeof Helpers.ParentDefinition.Model.Type, nextChild: typeof Helpers.ChildModel.Type) =>
    modifyFields(model, {
      child: () => nextChild,
      announcement: () => nextChild.label,
    }),
}

unrelatedMethodAlias(ChildBlock, writer)
unrelatedDestructuredMap(ChildBlock, writer)
unrelatedNamespaceAliasAgain.makeMapBinding(ChildBlock, writer)
