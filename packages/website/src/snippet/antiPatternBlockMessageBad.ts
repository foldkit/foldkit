// ❌ Bad: the parent imports and constructs an internal Settings Message.

import { Message as SettingsMessage } from './settings/message'

const SettingsBinding = ParentBlock.makeBinding(Settings.SettingsBlock, {
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
