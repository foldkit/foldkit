import { Duration, Effect } from 'effect'

import { makeCommand } from './block'
import { Message } from './message'

export const SubmitApplication = makeCommand('SubmitApplication', {
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
