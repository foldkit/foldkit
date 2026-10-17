import { Application } from './definition'
import { Message } from './message'
import { Model } from './model'
import * as Settings from './settings'

// ❌ Bad: this forwarder can never forward an OutMessage.
const BadSettingsBinding = Application.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  outMessage: {
    fold: foldSettingsOutMessage,
    forward: () => undefined,
  },
})

// ✅ Good: omit `forward` when every child OutMessage stops here.
const SettingsBinding = Application.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  outMessage: { fold: foldSettingsOutMessage },
})
