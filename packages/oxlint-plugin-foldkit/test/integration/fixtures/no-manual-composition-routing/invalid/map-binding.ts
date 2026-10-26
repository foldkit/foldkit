import { makeMapBinding as bindMap } from 'foldkit/mapBinding'
import * as MapBinding from 'foldkit/mapBinding'

bindMap(ParentDefinition, ChildBlock, {
  field: 'childrenById',
  parentMessage: ParentMessage.GotChildMessage,
})

MapBinding.makeMapBinding(ParentDefinition, ChildBlock, {
  field: 'childrenById',
  toParentMessage: message => ParentMessage.GotChildMessage({ message }),
})
