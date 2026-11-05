import { Effect, Schema } from 'effect'

import { Message, makeCommand } from './block'

export const DelayAdvanceAsyncCounterPhase = makeCommand(
  'DelayAdvanceAsyncCounterPhase',
  {
    args: { generation: Schema.Number, duration: Schema.DurationFromMillis },
    messages: [Message.CompletedDelayAdvanceAsyncCounterPhase],
    handler: function* () {
      return ({ generation, duration }) =>
        Effect.sleep(duration).pipe(
          Effect.as(
            Message.CompletedDelayAdvanceAsyncCounterPhase({ generation }),
          ),
        )
    },
  },
)
