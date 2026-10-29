import { Schema, String } from 'effect'
import { Block } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SaveState = defineTaggedUnion({ Idle: {}, Saving: {} })
type SaveState = typeof SaveState.Type

const Model = Schema.Struct({ title: Schema.String, saveState: SaveState })
type Model = typeof Model.Type

const DraftDefinition = Block.makeDefinition('Draft', {
  Model,
  Message: Schema.Never,
})

const { makeStep } = DraftDefinition

const editDraftStep = (change: (model: Model) => Model) =>
  makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return { model: change(model) }
  })

const uppercaseTitleStep = editDraftStep(model =>
  modifyFields(model, { title: String.toUpperCase }),
)
const savingDraft = Model.make({
  title: 'Draft',
  saveState: SaveState.Saving(),
})
const blockedEdit = uppercaseTitleStep(savingDraft)
