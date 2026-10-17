// ❌ Bad: the parent imports and constructs an internal Settings Message.

import { Message as SettingsMessage } from './settings/message'

const SettingsBinding = Parent.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
})

const update = ParentComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedResetSettings: () =>
      SettingsBinding.fold(
        model,
        SettingsMessage.ChangedTheme({ theme: 'Light' }),
      ),
  }),
)
