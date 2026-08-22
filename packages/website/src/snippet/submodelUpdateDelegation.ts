import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotSettingsMessage: ({ message }) => {
      const settingsUpdate = Settings.update(model.settings, message)

      const mappedCommands = Command.mapMessages(
        settingsUpdate.commands ?? [],
        message => GotSettingsMessage({ message }),
      )

      return {
        model: evo(model, { settings: () => settingsUpdate.model }),
        commands: mappedCommands,
      }
    },
  })
