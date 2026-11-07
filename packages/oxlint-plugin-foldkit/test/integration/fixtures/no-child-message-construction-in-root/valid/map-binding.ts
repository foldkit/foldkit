import { Child } from './child'
import * as Helpers from './nested/definition'
import { Message, NestedDefinition, makeHashMapBinding as bindMap } from './nested/definition'

NestedDefinition.makeHashMapBinding(Child.block, {
  field: 'childrenById',
  delivery: {
    when: () => {
      Message.ClickedSave()
      return true
    },
  },
})

bindMap(Child.block, {
  field: 'rowsById',
  childField: 'child',
  delivery: {
    when: () => {
      Message.ClickedSave()
      return true
    },
  },
})

const namespaceAlias = Helpers
const namespaceAliasAgain = namespaceAlias
const namespaceMethodAlias = namespaceAliasAgain.makeHashMapBinding
const { makeHashMapBinding: namespaceDestructuredMap } = namespaceAliasAgain

Helpers.makeHashMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Message.ClickedSave(); return true } },
})

namespaceMethodAlias(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Message.ClickedSave(); return true } },
})

namespaceDestructuredMap(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Message.ClickedSave(); return true } },
})

namespaceAliasAgain.makeHashMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Message.ClickedSave(); return true } },
})
