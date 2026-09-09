import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import * as Settings from './settings'

// ❌ Bad
const badFoldSettings = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
  foldOutMessage: foldSettingsOutMessage,
  // This mapper directly returns undefined, so it forwards no OutMessage.
  toParentOutMessage: () => undefined,
})

// ✅ Good
// This fold emits no parent OutMessage. Other branches in the same update may
// still emit an OutMessage.
const foldSettings = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
  foldOutMessage: foldSettingsOutMessage,
})
