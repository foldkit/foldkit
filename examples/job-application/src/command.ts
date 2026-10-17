import { Duration, Effect } from 'effect'

import { Application } from './definition'
import { Message } from './message'

export const SubmitApplication = Application.command('SubmitApplication', {
  messages: [
    Message.SucceededSubmitApplication,
    Message.FailedSubmitApplication,
  ],
  handler: function* () {
    return () =>
      Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(1500))
        return Message.SucceededSubmitApplication()
      })
  },
})

export const EffectsLayer = SubmitApplication.layer
