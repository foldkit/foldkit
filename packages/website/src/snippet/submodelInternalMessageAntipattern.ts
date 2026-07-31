// PARENT UPDATE

import { Message as SettingsMessage } from './settings/message'

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

ClickedResetSettings: () =>
  foldSettings(model, SettingsMessage.ChangedTheme({ theme: 'Light' }))
