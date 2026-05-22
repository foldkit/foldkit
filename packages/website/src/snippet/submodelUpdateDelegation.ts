import { Match as M } from 'effect'
import { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotSettingsMessage: ({ message }) => {
        const [nextSettings, commands] = Settings.update(
          model.settings,
          message,
        )

        const mappedCommands = Command.mapMessages(commands, message =>
          GotSettingsMessage({ message }),
        )

        return [evo(model, { settings: () => nextSettings }), mappedCommands]
      },
    }),
  )
