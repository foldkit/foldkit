import { Effect, Stream } from 'effect'
import { Block, Command } from 'foldkit'

import { Message, Model } from './definition'

export const LoadPreferences = Command.define('LoadPreferences', {
  messages: [Message.CompletedLoadPreferences],
})

export class Application extends Block<Application>()('Application', {
  Model,
  Message,
  Command: [LoadPreferences],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { isTicking: false },
      update: {
        Ticked: model => ({ model }),
        CompletedLoadPreferences: model => ({ model }),
      },
      commands: {
        LoadPreferences: () =>
          Effect.succeed(Message.CompletedLoadPreferences()),
      },
      stream: Stream.empty,
    }
  }),
)

export const revision = 1
