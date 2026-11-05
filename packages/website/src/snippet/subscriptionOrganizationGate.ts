import { makeBinding } from './block'
import * as Settings from './settings'

export const SettingsBinding = makeBinding(Settings.SettingsBlock, {
  field: 'settings',
  subscriptions: {
    when: ({ route }) => route._tag === 'Settings',
  },
})
