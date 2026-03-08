import { Array, Effect, Match as M } from 'effect'
import { Command } from 'foldkit/command'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotSettingsMessage: ({ message }) => {
        const [nextSettings, commands] = Settings.update(model.settings, message)

        const mappedCommands = Array.map(
          commands,
          Effect.map(message => GotSettingsMessage({ message })),
        )

        return [evo(model, { settings: () => nextSettings }), mappedCommands]
      },
    }),
  )
