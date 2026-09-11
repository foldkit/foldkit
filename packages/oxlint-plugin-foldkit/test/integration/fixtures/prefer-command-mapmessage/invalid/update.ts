import { Effect } from 'effect'
import { Command } from 'foldkit'

import { childCommand } from './child'
import { Message } from './message'

// Lifts the result Message through the Effect layer. It dispatches correctly
// but records nothing on the message-mapping chain, so resolve cannot recover
// it in a test.
export const wrapped = Command.mapEffect(
  childCommand,
  Effect.map(message => Message.GotChildMessage({ message })),
)

// A block-bodied arrow that returns the wrapped Message is the same anti-pattern.
export const wrappedBlock = Command.mapEffect(
  childCommand,
  Effect.map(message => {
    return Message.GotChildMessage({ message })
  }),
)

// The point-free namespaced constructor lift is the same anti-pattern.
export const wrappedPointFree = Command.mapEffect(
  childCommand,
  Effect.map(Message.GotChildMessage),
)

// A data-first Effect.map inside the transform has the same missing metadata.
export const wrappedDataFirst = Command.mapEffect(childCommand, effect =>
  Effect.map(effect, message => Message.GotChildMessage({ message })),
)
