import { Array, Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as KeyedEntry from './keyedEntry'

const Model = Schema.Struct({ entries: Schema.Array(KeyedEntry.Model) })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  GotEntryMessage: { id: Schema.String, message: KeyedEntry.Message },
  ClickedUpdateEntryManually: {},
})
const Application = defineApplication({ Model, Message })
const EntriesBinding = Application.bindChild(KeyedEntry.Entry, {
  field: 'entries',
  key: 'id',
  toParentMessage: (id, message) =>
    Message.GotEntryMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotEntryMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
})
const ApplicationComposition = Application.makeComposition({
  childBindings: [EntriesBinding],
})

export const updateEntryManually = ApplicationComposition.makeUpdate(model => {
  const nextModel = modifyFields(model, {
    entries: Array.map(entry =>
      modifyFields(entry, { theme: () => 'Dark' }),
    ),
  })
  void nextModel

  return EntriesBinding.setTheme('initial', 'Light')(model)
})
