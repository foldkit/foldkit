import { makeRequiredFieldBinding } from './block'
import * as Settings from './settings'

// ❌ Bad: this forwarder can never forward an OutMessage.
const BadSettingsBinding = makeRequiredFieldBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({
  fold: foldSettingsOutMessage,
  forward: () => undefined,
})

// ✅ Good: omit `forward` when every child OutMessage stops here.
const SettingsBinding = makeRequiredFieldBinding(Settings.SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({ fold: foldSettingsOutMessage })
