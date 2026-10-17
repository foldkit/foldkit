import { Option, Schema } from 'effect'
import { Update, defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import * as BoundSettings from './boundSettings'
import * as KeyedEntry from './keyedEntry'

const Model = Schema.Struct({
  entries: Schema.Array(KeyedEntry.Model),
  maybeSettings: Schema.Option(BoundSettings.Model),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  GotEntryMessage: { id: Schema.String, message: KeyedEntry.Message },
  GotSettingsMessage: { message: BoundSettings.Message },
  ClickedApplyThemes: {},
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
const MaybeSettingsBinding = Application.bindChild(BoundSettings.Settings, {
  field: 'maybeSettings',
  parentMessage: Message.GotSettingsMessage,
})
const ApplicationComposition = Application.makeComposition({
  childBindings: [EntriesBinding, MaybeSettingsBinding],
})

export const initial: Model = Model.make({
  entries: [],
  maybeSettings: Option.none(),
})

export const updateWithNamedOperations = ApplicationComposition.makeUpdate(model =>
  Update.combine(model, [
    EntriesBinding.setTheme('initial', 'Light'),
    MaybeSettingsBinding.setTheme('Dark'),
  ])
)
