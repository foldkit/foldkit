import { Effect, Stream } from 'effect'
import { Block } from 'foldkit'

import { Message, Model } from './definition'
import { LoadPreferences } from './extracted'

export { LoadPreferences } from './extracted'

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

export const revision = 2
