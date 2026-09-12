// ✅ Good: the child exposes a helper that still runs its update.

// SETTINGS SUBMODEL

import { Message as SettingsMessage } from './message'

export const setTheme = (model: Model, theme: Theme) =>
  update(model, SettingsMessage.ChangedTheme({ theme }))

// PARENT UPDATE

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

const handlers = {
  ClickedResetSettings: () => foldSettingsTheme(model, 'Light'),
}
