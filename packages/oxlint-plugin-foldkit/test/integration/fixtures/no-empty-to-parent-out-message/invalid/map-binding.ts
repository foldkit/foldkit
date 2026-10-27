import { Block } from 'foldkit'
import * as Helpers from '../shared/definition'

const ParentDefinition = Block.makeDefinition('MapPolicyParent', { Model, Message })
const { makeMapBinding } = ParentDefinition
const ChildrenBinding = makeMapBinding(ChildBlock, { field: 'children' })

ChildrenBinding.withOutMessagePolicy({ forward: () => undefined })

const namespaceAlias = Helpers
const namespaceMethodAlias = namespaceAlias.makeMapBinding
const { makeMapBinding: namespaceDestructuredMap } = namespaceAlias

namespaceMethodAlias(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceDestructuredMap(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
namespaceAlias.makeMapBinding(ChildBlock, { field: 'children' }).withOutMessagePolicy({ forward: () => undefined })
