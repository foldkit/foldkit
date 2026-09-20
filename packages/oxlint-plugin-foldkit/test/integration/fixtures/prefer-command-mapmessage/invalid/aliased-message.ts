import { Effect } from 'effect'
import { Command } from 'foldkit'

import { childCommand } from './child'
import { Message as M } from './message'

export const wrappedAliasedMessage = Command.mapEffect(
  childCommand,
  Effect.map(message => M.GotChildMessage({ message })),
)
