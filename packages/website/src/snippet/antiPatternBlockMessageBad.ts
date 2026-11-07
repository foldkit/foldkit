// ❌ Bad: the parent imports and constructs an internal Settings Message.

import { makeRequiredFieldBinding } from './block'
import { Message as SettingsMessage } from './settings/message'

const SettingsBinding = makeRequiredFieldBinding(Settings.SettingsBlock, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
})

const update = ParentComposition.makeUpdate({
  ClickedResetSettings: model =>
    SettingsBinding.fold(
      model,
      SettingsMessage.ChangedTheme({ theme: 'Light' }),
    ),
})
