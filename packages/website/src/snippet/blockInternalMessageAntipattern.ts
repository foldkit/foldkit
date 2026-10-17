// PARENT UPDATE

import { Message as SettingsMessage } from './settings/message'

ClickedResetSettings: () =>
  SettingsBinding.fold(model, SettingsMessage.ChangedTheme({ theme: 'Light' }))
