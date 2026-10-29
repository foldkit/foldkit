import { Child } from './child'
import * as Helpers from './nested/definition'
import { Message, NestedDefinition, makeMapBinding as bindMap } from './nested/definition'

NestedDefinition.makeMapBinding(Child.block, {
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
const namespaceMethodAlias = namespaceAliasAgain.makeMapBinding
const { makeMapBinding: namespaceDestructuredMap } = namespaceAliasAgain

Helpers.makeMapBinding(Child.block, {
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

namespaceAliasAgain.makeMapBinding(Child.block, {
  field: 'childrenById',
  delivery: { when: () => { Message.ClickedSave(); return true } },
})
