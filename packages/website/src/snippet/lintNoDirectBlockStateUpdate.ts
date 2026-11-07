import { modifyFields } from 'foldkit/struct'

import { makeStep, makeRequiredFieldBinding } from './block'
import { Model } from './model'
import * as Settings from './settings'

const SettingsBinding = makeRequiredFieldBinding(Settings.SettingsBlock, {
  field: 'settings',
})

// ❌ Bad: the parent changes a child field without running Settings.update.
const badReset = (model: Model) => ({
  model: modifyFields(model, {
    settings: current => modifyFields(current, { theme: () => 'Light' }),
  }),
})

// ✅ Good: the child decides the transition and the Binding preserves it.
const goodReset = makeStep(() => SettingsBinding.requestThemeChange('Light'))
