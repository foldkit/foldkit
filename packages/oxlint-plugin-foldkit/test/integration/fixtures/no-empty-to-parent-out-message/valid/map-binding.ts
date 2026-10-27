import { Block } from 'foldkit'
import * as UnrelatedHelpers from '../shared/unrelated'

const ParentDefinition = Block.makeDefinition('MapPolicyParent', { Model, Message })
const { makeMapBinding } = ParentDefinition

makeMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({
  forward: outMessage => ParentOutMessage.ReportedChild({ outMessage }),
})

const unrelated = { makeMapBinding: (_child: unknown, config: unknown) => config }
const { makeMapBinding: unrelatedBindMap } = unrelated
unrelatedBindMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({
  forward: () => undefined,
})

const namespaceAlias = UnrelatedHelpers
const namespaceMethodAlias = namespaceAlias.makeMapBinding
const { makeMapBinding: namespaceDestructuredMap } = namespaceAlias

namespaceMethodAlias(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceDestructuredMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceAlias.makeMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
