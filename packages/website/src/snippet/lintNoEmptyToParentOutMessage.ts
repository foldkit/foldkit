import { ApplicationBlock } from './definition'
import * as Settings from './settings'

// ❌ Bad: this forwarder can never forward an OutMessage.
const BadSettingsBinding = ApplicationBlock.makeBinding(
  Settings.SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({
  fold: foldSettingsOutMessage,
  forward: () => undefined,
})

// ✅ Good: omit `forward` when every child OutMessage stops here.
const SettingsBinding = ApplicationBlock.makeBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({ fold: foldSettingsOutMessage })
