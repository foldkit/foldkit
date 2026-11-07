import { Block } from 'foldkit'
import * as UnrelatedHelpers from '../shared/unrelated'

const ParentDefinition = Block.makeDefinition('MapPolicyParent', { Model, Message })
const { makeHashMapBinding } = ParentDefinition

makeHashMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({
  forward: outMessage => ParentOutMessage.ReportedChild({ outMessage }),
})

const unrelated = { makeHashMapBinding: (_child: unknown, config: unknown) => config }
const { makeHashMapBinding: unrelatedBindMap } = unrelated
unrelatedBindMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({
  forward: () => undefined,
})

const namespaceAlias = UnrelatedHelpers
const namespaceMethodAlias = namespaceAlias.makeHashMapBinding
const { makeHashMapBinding: namespaceDestructuredMap } = namespaceAlias

namespaceMethodAlias(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceDestructuredMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceAlias.makeHashMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
