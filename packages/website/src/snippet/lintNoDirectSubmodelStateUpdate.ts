import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Settings from './settings'

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: model => Option.some(model.settings),
  write: (model, nextSettings) =>
    modifyFields(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

// ❌ Bad: the parent changes a child field without running Settings.update.
const badReset = model => ({
  model: modifyFields(model, {
    settings: settings => modifyFields(settings, { theme: () => 'Light' }),
  }),
})

// ✅ Good: the child decides the transition and the fold preserves its result.
const goodReset = model => foldSettingsTheme(model, 'Light')
