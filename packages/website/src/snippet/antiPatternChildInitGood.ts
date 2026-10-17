// ✅ Good: assemble the initial child, then restore against the complete Model.

import { ApplicationComposition, SettingsBinding } from './composition'
const init = ApplicationComposition.makeInit(
  (username: string, savedTheme: Settings.Theme) => ({
    model: {
      username,
      maybeRestoredTheme: Option.none(),
    },
    steps: [SettingsBinding.restore(savedTheme)],
  }),
)
