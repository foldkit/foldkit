import { Effect } from 'effect'

import { ReadValue } from './command.js'
import { HandlerBuildError, HostValue, Message } from './contracts.js'

export const HostHandlers = ReadValue.toLayer(
  Effect.gen(function* () {
    const source = yield* HostValue

    if (source.isUnavailable) {
      return yield* Effect.fail(new HandlerBuildError())
    }

    return () =>
      Effect.succeed(Message.CompletedReadValue({ value: source.value }))
  }),
)
