import { makeRequiredFieldBinding } from './block'
import * as Settings from './settings'

export const SettingsBinding = makeRequiredFieldBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
    subscriptions: {
      when: ({ route }) => route._tag === 'Settings',
    },
  },
)
