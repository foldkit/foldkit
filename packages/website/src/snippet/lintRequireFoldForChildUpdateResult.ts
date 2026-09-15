import { Option } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import * as Settings from './settings'

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: model => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => Message.GotSettingsMessage({ message }),
})

// ❌ Bad: copying the child Model drops any Commands or OutMessage.
const badReset = model => {
  const settingsReset = Settings.setTheme(model.settings, 'Light')

  return { model: evo(model, { settings: () => settingsReset.model }) }
}

// ✅ Good: the fold preserves the complete child update result.
const goodReset = model => foldSettingsTheme(model, 'Light')
