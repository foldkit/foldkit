import { makeMapBinding as bindMap } from 'foldkit/mapBinding'
import * as MapBinding from 'foldkit/mapBinding'

import { Child } from './child'
import { Message, NestedDefinition } from './nested/definition'

bindMap(NestedDefinition, Child.block, {
  field: 'childrenById',
  delivery: {
    when: () => {
      Message.ClickedSave()
      return true
    },
  },
})

MapBinding.makeMapBinding(NestedDefinition, Child.block, {
  field: 'rowsById',
  childField: 'child',
  delivery: {
    when: () => {
      Message.ClickedSave()
      return true
    },
  },
})
