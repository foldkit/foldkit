import { Schema, String } from 'effect'
import { Block } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SaveState = defineTaggedUnion({ Idle: {}, Saving: {} })
const Model = Schema.Struct({ title: Schema.String, saveState: SaveState })
const DraftDefinition = Block.makeDefinition('Draft', {
  Model,
  Message: Schema.Never,
})

const editDraft = (change: (model: typeof Model.Type) => typeof Model.Type) =>
  DraftDefinition.makeStep(model => {
    if (SaveState.guards.Saving(model.saveState)) {
      return { model }
    }

    return { model: change(model) }
  })

const uppercaseTitle = editDraft(model =>
  modifyFields(model, { title: String.toUpperCase }),
)
const savingDraft = Model.make({
  title: 'Draft',
  saveState: SaveState.Saving(),
})
const blockedEdit = uppercaseTitle(savingDraft)
