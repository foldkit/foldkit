import { makeBinding } from './block'
import * as Settings from './settings'

// ❌ Bad: this forwarder can never forward an OutMessage.
const BadSettingsBinding = makeBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({
  fold: foldSettingsOutMessage,
  forward: () => undefined,
})

// ✅ Good: omit `forward` when every child OutMessage stops here.
const SettingsBinding = makeBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({ fold: foldSettingsOutMessage })
