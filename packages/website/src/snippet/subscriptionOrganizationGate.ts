import { ApplicationBlock } from './definition'
import * as Settings from './settings'

export const SettingsBinding = ApplicationBlock.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
    subscriptions: {
      when: ({ route }) => route._tag === 'Settings',
    },
  },
)
