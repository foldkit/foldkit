// ❌ A connected initializer is a recipe; taking its Model discards its channels.
import { Option } from 'effect'

import { ApplicationComposition, SettingsBinding } from './composition'

export const init = ApplicationComposition.makeInit((username, savedTheme) => {
  const settingsInit = SettingsBinding.init({
    args: [],
    toParentModel: settings => ({
      username,
      settings,
      maybeRestoredTheme: Option.none(),
    }),
  })

  return {
    model: settingsInit.model,
    steps: [SettingsBinding.requestRestore({ theme: savedTheme })],
  }
})
