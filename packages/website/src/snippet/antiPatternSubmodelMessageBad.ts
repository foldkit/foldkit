// ❌ Bad: the parent imports and constructs an internal Settings Message.

import { Update } from 'foldkit'

import { Message as SettingsMessage } from './settings/message'

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetSettings: () =>
      foldSettings(model, SettingsMessage.ChangedTheme({ theme: 'Light' })),
  })
