import * as MapHelpers from '../shared/definition'
import { ParentDefinition, makeMapBinding as importedBindMap } from '../shared/definition'

const { makeMapBinding: bindMap } = ParentDefinition

ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

bindMap(ChildBlock, {
  field: 'childrenById',
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
})

importedBindMap(ChildBlock, {
  field: 'childrenById',
  fromParentMessage: message => message,
})

MapHelpers.makeMapBinding(ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

const namespaceMethodAlias = MapHelpers.makeMapBinding
const namespaceMethodAliasAgain = namespaceMethodAlias
const { makeMapBinding: namespaceDestructuredMap } = MapHelpers
const namespaceAlias = MapHelpers
const namespaceAliasAgain = namespaceAlias
const { makeMapBinding: namespaceAliasDestructuredMap } = namespaceAliasAgain
const importedHelperAlias = importedBindMap

namespaceMethodAliasAgain(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
namespaceDestructuredMap(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
namespaceAliasAgain.makeMapBinding(ChildBlock, { fromParentMessage: message => message })
namespaceAliasDestructuredMap(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
importedHelperAlias(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
