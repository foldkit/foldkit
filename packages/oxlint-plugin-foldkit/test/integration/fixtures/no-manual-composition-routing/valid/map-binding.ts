import { makeMapBinding as bindMap } from 'foldkit/mapBinding'
import * as MapBinding from 'foldkit/mapBinding'
import { makeMapBinding as unrelatedMapBinding } from 'third-party'

bindMap(ParentDefinition, ChildBlock, { field: 'childrenById' })
MapBinding.makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'rowsById',
  childField: 'child',
})

unrelatedMapBinding(ParentDefinition, ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

export const callShadowed = (
  makeMapBinding: (...args: ReadonlyArray<unknown>) => unknown,
) =>
  makeMapBinding(ParentDefinition, ChildBlock, {
    field: 'childrenById',
    toParentMessage: ParentMessage.GotChildMessage,
  })
