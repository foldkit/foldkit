import { Effect } from 'effect'
import { Command } from 'foldkit'

import {
  auditEffect,
  childCommand,
  childCommands,
  provideContext,
} from './child'
import { Message } from './message'

// The sanctioned lift: records on the message-mapping chain so resolve recovers
// it.
export const mapped = Command.mapMessages(childCommands, message =>
  Message.GotChildMessage({ message }),
)

// mapEffect that adjusts the Effect itself (providing a service) is fine.
export const provided = Command.mapEffect(childCommand, provideContext)

// Mapping an unrelated Effect inside tap does not change the Command result.
export const audited = Command.mapEffect(childCommand, effect =>
  Effect.tap(effect, () =>
    Effect.map(auditEffect, () => Message.RecordedAudit()),
  ),
)

// A callback parameter named Message is not the imported Message union.
export const shadowedMessageParameter = Command.mapEffect(childCommand, effect =>
  Effect.map(effect, Message => Message.Reset()),
)
