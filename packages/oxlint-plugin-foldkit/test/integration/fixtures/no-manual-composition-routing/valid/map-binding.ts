import { makeMapBinding as unrelatedMapBinding } from 'third-party'
import * as MapHelpers from '../shared/definition'
import * as UnrelatedHelpers from '../shared/unrelated'

import { ParentDefinition, makeMapBinding as importedBindMap } from '../shared/definition'

const { makeMapBinding: bindMap } = ParentDefinition
bindMap(ChildBlock, { field: 'childrenById' })
ParentDefinition.makeMapBinding(ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})
importedBindMap(ChildBlock, { field: 'childrenById' })
MapHelpers.makeMapBinding(ChildBlock, { field: 'childrenById' })

UnrelatedHelpers.makeMapBinding(ChildBlock, {
  parentMessage: ParentMessage.GotChildMessage,
})

unrelatedMapBinding(ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

const unrelatedDefinition = {
  makeMapBinding: (_child: unknown, config: unknown) => config,
}
const { makeMapBinding: unrelatedBindMap } = unrelatedDefinition
unrelatedDefinition.makeMapBinding(ChildBlock, {
  parentMessage: ParentMessage.GotChildMessage,
})
unrelatedBindMap(ChildBlock, {
  toParentMessage: ParentMessage.GotChildMessage,
})

export const callShadowed = (
  makeMapBinding: (...args: ReadonlyArray<unknown>) => unknown,
) =>
  makeMapBinding(ChildBlock, {
    field: 'childrenById',
    toParentMessage: ParentMessage.GotChildMessage,
  })

const unrelatedNamespaceAlias = UnrelatedHelpers
const unrelatedNamespaceAliasAgain = unrelatedNamespaceAlias
const unrelatedMethodAlias = unrelatedNamespaceAliasAgain.makeMapBinding
const { makeMapBinding: unrelatedDestructuredMap } = unrelatedNamespaceAliasAgain
const unrelatedMethodAliasAgain = unrelatedMethodAlias
unrelatedMethodAliasAgain(ChildBlock, { parentMessage: ParentMessage.GotChildMessage })
unrelatedDestructuredMap(ChildBlock, { toParentMessage: ParentMessage.GotChildMessage })
unrelatedNamespaceAliasAgain.makeMapBinding(ChildBlock, { fromParentMessage: message => message })
