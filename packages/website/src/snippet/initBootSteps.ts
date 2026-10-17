import {
  ApplicationComposition,
  SessionBinding,
  SettingsBinding,
} from './composition'
import type { Flags } from './flags'

const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: {},
  steps: [
    SettingsBinding.restore(flags.savedSettings),
    SessionBinding.resume(),
  ],
}))
