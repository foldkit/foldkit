import { Option } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => GotSettingsMessage({ message }),
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotSettingsMessage: ({ message }) => foldSettings(model, message),
  })
