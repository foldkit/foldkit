import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotSettingsMessage: ({ message }) => foldSettings(model, message),
  })
