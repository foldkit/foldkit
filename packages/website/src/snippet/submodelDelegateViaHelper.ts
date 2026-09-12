// CHILD

import { Message as ChildMessage } from './message'

export const setTheme = (model: Model, theme: Theme) =>
  update(model, ChildMessage.ChangedTheme({ theme }))

// PARENT UPDATE

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

ClickedResetSettings: () => foldSettingsTheme(model, 'Light')
