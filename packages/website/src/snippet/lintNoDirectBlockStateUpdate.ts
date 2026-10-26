import { modifyFields } from 'foldkit/struct'

import { ApplicationDefinition, makeStep } from './definition'
import { Model } from './model'
import * as Settings from './settings'

const SettingsBinding = ApplicationDefinition.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
)

// ❌ Bad: the parent changes a child field without running Settings.update.
const badResetStep = (model: Model) => ({
  model: modifyFields(model, {
    settings: current => modifyFields(current, { theme: () => 'Light' }),
  }),
})

// ✅ Good: the child decides the transition and the Binding preserves it.
const goodResetStep = makeStep(() =>
  SettingsBinding.requestThemeChange('Light'),
)
