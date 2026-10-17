// ❌ Bad: running the child Step directly and copying selected fields drops
// the RestoredTheme OutMessage.

// init.ts

import { ApplicationComposition } from './composition'

const init = ApplicationComposition.makeInit(
  (username: string, savedTheme: Settings.Theme) => {
    const settingsInit = Settings.init()
    const settingsRestore = Settings.restore(settingsInit.model, savedTheme)
    const commands = Command.mapMessages(settingsRestore.commands, message =>
      Message.GotSettingsMessage({ message }),
    )

    // ❌ The parent keeps the Model and Commands but drops
    // settingsRestore.outMessage.
    return {
      model: Model.make({
        username,
        settings: settingsRestore.model,
        maybeRestoredTheme: Option.none(),
      }),
      commands,
    }
  },
)
