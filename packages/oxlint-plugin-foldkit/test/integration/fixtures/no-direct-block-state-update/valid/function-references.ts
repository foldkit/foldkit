import { Array, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Child from './functionReferenceChild'
import * as Foreign from './functionReferenceForeign'

const Model = Schema.Struct({
  child: Child.Model,
  entries: Schema.Array(Child.Model),
  preferences: Child.Model,
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ClickedApplyTheme: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ChildBinding = ApplicationDefinition.makeBinding(
  Child.FunctionReferenceChildBlock,
  {
    field: 'child',
    init: false,
  },
)
const EntriesBinding = ApplicationDefinition.makeBinding(
  Child.FunctionReferenceChildBlock,
  {
    field: 'entries',
    key: 'id',
  },
)
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ChildBinding, EntriesBinding],
})
const revealPreferenceErrors = ApplicationDefinition.makeFieldsStep(() => ({
  preferences: Foreign.revealErrors,
}))

const revealPreferenceErrorsThroughParentHelper = (model: Model): Model =>
  modifyFields(model, { preferences: Foreign.revealErrors })

export const update = ApplicationComposition.makeUpdate({
  ClickedApplyTheme: model => {
    void modifyFields(model, { child: Foreign.revealErrors })
    void modifyFields(model, { preferences: Foreign.revealErrors })
    void revealPreferenceErrorsThroughParentHelper(model)
    void modifyFields(model, { entries: Array.map(Foreign.revealErrors) })
    void modifyFields(model, {
      entries: Array.filter(entry => entry.id !== 'removed'),
    })

    return Update.combineSteps(model, [
      revealPreferenceErrors,
      ApplicationDefinition.makeNoopStep(),
      ChildBinding.informThemeChanged({ theme: 'Light' }),
      EntriesBinding.informThemeChanged('retained', { theme: 'Light' }),
    ])
  },
})
