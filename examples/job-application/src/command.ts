import { Duration, Effect } from 'effect'
import { Command } from 'foldkit'

import { Message } from './message'

// COMMAND

export const SubmitApplication = Command.define('SubmitApplication', {
  messages: [
    Message.SucceededSubmitApplication,
    Message.FailedSubmitApplication,
  ],
  execute: Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(1500))
    return Message.SucceededSubmitApplication()
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(
        Message.FailedSubmitApplication({ error: 'Submission failed' }),
      ),
    ),
  ),
})
