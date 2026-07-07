import { Command } from 'foldkit'

import { childCommand, childCommands, provideContext } from './child'
import { GotChildMessage } from './message'

// The sanctioned lift: records on the message-mapping chain so resolve recovers
// it.
export const mapped = Command.mapMessages(childCommands, message =>
  GotChildMessage({ message }),
)

// mapEffect that adjusts the Effect itself (providing a service) is fine.
export const provided = Command.mapEffect(childCommand, provideContext)
