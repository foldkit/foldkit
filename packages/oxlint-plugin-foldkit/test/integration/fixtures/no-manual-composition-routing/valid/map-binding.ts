import { makeHashMapBinding as unrelatedMapBinding } from 'third-party'
import * as MapHelpers from '../shared/definition'
import * as UnrelatedHelpers from '../shared/unrelated'

import { ParentDefinition, makeHashMapBinding as importedBindMap } from '../shared/definition'

const { makeHashMapBinding: bindMap } = ParentDefinition
bindMap(ChildBlock, { field: 'childrenById' })
ParentDefinition.makeHashMapBinding(ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
importedBindMap(ChildBlock, { field: 'childrenById' })
MapHelpers.makeHashMapBinding(ChildBlock, { field: 'childrenById' })

UnrelatedHelpers.makeHashMapBinding(ChildBlock, {
  parentMessage: ParentMessage.GotChildMessage,
})

unrelatedMapBinding(ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

const unrelatedDefinition = {
  makeHashMapBinding: (_child: unknown, config: unknown) => config,
}
const { makeHashMapBinding: unrelatedBindMap } = unrelatedDefinition
unrelatedDefinition.makeHashMapBinding(ChildBlock, {
  parentMessage: ParentMessage.GotChildMessage,
})
unrelatedBindMap(ChildBlock, {
  toParentMessage: ParentMessage.GotChildMessage,
})

export const callShadowed = (
  makeHashMapBinding: (...args: ReadonlyArray<unknown>) => unknown,
) =>
  makeHashMapBinding(ChildBlock, {
    field: 'childrenById',
    toParentMessage: ParentMessage.GotChildMessage,
  })

const unrelatedNamespaceAlias = UnrelatedHelpers
const unrelatedNamespaceAliasAgain = unrelatedNamespaceAlias
const unrelatedMethodAlias = unrelatedNamespaceAliasAgain.makeHashMapBinding
const { makeHashMapBinding: unrelatedDestructuredMap } = unrelatedNamespaceAliasAgain
const unrelatedMethodAliasAgain = unrelatedMethodAlias
unrelatedMethodAliasAgain(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
unrelatedDestructuredMap(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
unrelatedNamespaceAliasAgain.makeHashMapBinding(ChildBlock, { fromParentMessage: message => message })
