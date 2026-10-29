import { Child } from './child'
import * as Helpers from './parent/definition'
import { makeMapBinding } from './parent/definition'

export const ChildByIdBinding = makeMapBinding(
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

const namespaceAlias = Helpers
const namespaceAliasAgain = namespaceAlias
const namespaceMethodAlias = namespaceAliasAgain.makeMapBinding
const { makeMapBinding: namespaceDestructuredMap } = namespaceAliasAgain

Helpers.makeMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Child.Message.ClickedParentMapSave(); return true } },
})

namespaceMethodAlias(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Child.Message.ClickedParentMapSave(); return true } },
})

namespaceDestructuredMap(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Child.Message.ClickedParentMapSave(); return true } },
})

namespaceAliasAgain.makeMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Child.Message.ClickedParentMapSave(); return true } },
})
