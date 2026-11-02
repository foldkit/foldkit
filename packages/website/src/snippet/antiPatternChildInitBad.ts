// ❌ Bad: manually initializing and restoring the child drops its Commands and
// RestoredTheme OutMessage when the parent keeps only the child Model.

import { Effect, Option } from 'effect'

import { ApplicationComposition, SettingsBinding } from './composition'
import { ApplicationDefinition } from './definition'
import * as Settings from './settings'
import { update } from './update'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settingsConnection = yield* SettingsBinding
    const settings = yield* Settings.block.get

    const init = ApplicationComposition.makeInit((username, savedTheme) => {
      const settingsInit = settings.init()
      const settingsRestore = settings.receive(
        settingsInit.model,
        Settings.InMessage.RequestedRestore({ theme: savedTheme }),
      )

      return {
        model: {
          username,
          settings: settingsRestore.model,
          maybeRestoredTheme: Option.none(),
        },
      }
    })

    return { children: [settingsConnection], init, update }
  }),
).provide(Settings.layer)
