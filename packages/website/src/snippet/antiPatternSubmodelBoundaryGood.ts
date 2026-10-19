// ✅ Good: the child exposes a helper that still runs its update.

// SETTINGS SUBMODEL

import { Update } from 'foldkit'

import { Message as SettingsMessage } from './message'
import { update as updateSettings } from './update'

export const setTheme = (model: Model, theme: Theme) =>
  updateSettings(model, SettingsMessage.ChangedTheme({ theme }))

// PARENT UPDATE

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedResetSettings: () => foldSettingsTheme(model, 'Light'),
  })
