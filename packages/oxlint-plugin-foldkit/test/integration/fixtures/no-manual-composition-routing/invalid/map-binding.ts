import * as MapHelpers from '../shared/definition'
import { ParentDefinition, makeHashMapBinding as importedBindMap } from '../shared/definition'

const { makeHashMapBinding: bindMap } = ParentDefinition

ParentDefinition.makeHashMapBinding(ChildBlock, {
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

MapHelpers.makeHashMapBinding(ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

const namespaceMethodAlias = MapHelpers.makeHashMapBinding
const namespaceMethodAliasAgain = namespaceMethodAlias
const { makeHashMapBinding: namespaceDestructuredMap } = MapHelpers
const namespaceAlias = MapHelpers
const namespaceAliasAgain = namespaceAlias
const { makeHashMapBinding: namespaceAliasDestructuredMap } = namespaceAliasAgain
const importedHelperAlias = importedBindMap

namespaceMethodAliasAgain(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
namespaceDestructuredMap(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
namespaceAliasAgain.makeHashMapBinding(ChildBlock, { fromParentMessage: message => message })
namespaceAliasDestructuredMap(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
importedHelperAlias(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
