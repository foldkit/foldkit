import { Effect } from 'effect'
import { Command } from 'foldkit'

import { childCommand } from './child'
import { GotChildMessage } from './message'

// Lifts the result Message through the Effect layer. It dispatches correctly
// but records nothing on the message-mapping chain, so resolve cannot recover
// it in a test.
export const wrapped = Command.mapEffect(
  childCommand,
  Effect.map(childMessage => GotChildMessage({ childMessage })),
)

// A block-bodied arrow that returns the wrapped Message is the same anti-pattern.
export const wrappedBlock = Command.mapEffect(
  childCommand,
  Effect.map(childMessage => {
    return GotChildMessage({ childMessage })
  }),
)

// The point-free Effect.map(GotChildMessage) lift is the same anti-pattern.
export const wrappedPointFree = Command.mapEffect(
  childCommand,
  Effect.map(GotChildMessage),
)
