import { makeMapBinding } from 'foldkit/mapBinding'

import { Child } from './child'
import { ParentDefinition } from './parent/definition'

export const ChildByIdBinding = makeMapBinding(
  ParentDefinition,
  Child.block,
  {
    field: 'childrenById',
    delivery: {
      when: () => {
        Child.Message.ClickedParentMapSave()
        return true
      },
    },
  },
)
