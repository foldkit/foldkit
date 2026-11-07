import { Block } from 'foldkit'
import * as Helpers from '../shared/definition'

const ParentDefinition = Block.makeDefinition('MapPolicyParent', { Model, Message })
const { makeHashMapBinding } = ParentDefinition
const ChildrenBinding = makeHashMapBinding(ChildBlock, { field: 'children' })

ChildrenBinding.withOutMessagePolicy({ forward: () => undefined })

const namespaceAlias = Helpers
const namespaceMethodAlias = namespaceAlias.makeHashMapBinding
const { makeHashMapBinding: namespaceDestructuredMap } = namespaceAlias

namespaceMethodAlias(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceDestructuredMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceAlias.makeHashMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
