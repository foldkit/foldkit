import { Child } from './child'
import * as Helpers from './parent/definition'
import { makeHashMapBinding } from './parent/definition'

export const ChildByIdBinding = makeHashMapBinding(
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
const namespaceMethodAlias = namespaceAliasAgain.makeHashMapBinding
const { makeHashMapBinding: namespaceDestructuredMap } = namespaceAliasAgain

Helpers.makeHashMapBinding(Child.block, {
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

namespaceAliasAgain.makeHashMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Child.Message.ClickedParentMapSave(); return true } },
})
