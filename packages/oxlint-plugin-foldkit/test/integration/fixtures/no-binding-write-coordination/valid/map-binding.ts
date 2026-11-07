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

const { makeRecordBinding: bindMap } = ParentDefinition
bindMap(ChildBlock, { field: 'childrenById' })
ParentDefinition.makeRecordBinding(ChildBlock, {
  field: 'moreChildrenById',
})

const makeRecordBinding = (
  _child: unknown,
  config: unknown,
) => config

makeRecordBinding(ChildBlock, {
  field: 'childrenById',
  write: 'unrelated',
})

export const callShadowed = (
  makeRecordBinding: (...args: ReadonlyArray<unknown>) => unknown,
) => makeRecordBinding(ChildBlock, { write: 'shadowed' })

const unrelatedDefinition = {
  makeRecordBinding: (_child: unknown, config: unknown) => config,
}
const { makeRecordBinding: unrelatedBindMap } = unrelatedDefinition
unrelatedDefinition.makeRecordBinding(ChildBlock, { write: 'unrelated method' })
unrelatedBindMap(ChildBlock, { write: 'unrelated extracted method' })

const unrelatedNamespaceAlias = UnrelatedHelpers
const unrelatedNamespaceAliasAgain = unrelatedNamespaceAlias
const unrelatedMethodAlias = unrelatedNamespaceAliasAgain.makeRecordBinding
const { makeRecordBinding: unrelatedDestructuredMap } = unrelatedNamespaceAliasAgain
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
unrelatedNamespaceAliasAgain.makeRecordBinding(ChildBlock, writer)
