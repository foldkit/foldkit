import { Array, Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Child from './functionReferenceChild'
import {
  block as ImportedChildBlock,
  revealErrors as revealImportedErrors,
} from './functionReferenceChild'

const Model = Schema.Struct({
  aliasedChild: Child.Model,
  child: Child.Model,
  entries: Schema.Array(Child.Model),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  GotAliasedChildMessage: { message: Child.Message },
  GotChildMessage: { message: Child.Message },
  GotEntryMessage: { id: Schema.String, message: Child.Message },
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})
const ChildBinding = ApplicationDefinition.makeBinding(Child.block, {
  field: 'child',
  parentMessage: Message.GotChildMessage,
})
const AliasedChildBinding = ApplicationDefinition.makeBinding(
  ImportedChildBlock,
  {
    field: 'aliasedChild',
    parentMessage: Message.GotAliasedChildMessage,
  },
)
const EntriesBinding = ApplicationDefinition.makeBinding(Child.block, {
  field: 'entries',
  key: 'id',
  toParentMessage: (id, message) => Message.GotEntryMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotEntryMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ChildBinding, AliasedChildBinding, EntriesBinding],
})

const revealLocalErrors = (child: Child.Model): Child.Model =>
  modifyFields(child, { theme: () => 'Error' })

const revealErrorsThroughParentHelper = (model: Model): Model =>
  modifyFields(model, { child: revealLocalErrors })

const revealChildFieldsStep = ApplicationDefinition.makeFieldsStep(() => ({
  child: Child.revealErrors,
}))

export const update = ApplicationComposition.makeUpdate({
  GotChildMessage: model => {
    void modifyFields(model, { child: Child.revealErrors })
    void modifyFields(model, { child: revealLocalErrors })
    void revealErrorsThroughParentHelper(model)
    void modifyFields(model, { aliasedChild: revealImportedErrors })
    void modifyFields(model, {
      entries: Array.map(Child.revealErrors),
    })
    void Update.combineSteps(model, [
      revealChildFieldsStep,
      ChildBinding.informThemeChanged({ theme: 'Light' }),
    ])

    return ChildBinding.informThemeChanged({ theme: 'Light' })(model)
  },
})
