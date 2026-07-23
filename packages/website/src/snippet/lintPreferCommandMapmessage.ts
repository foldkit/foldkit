import { Effect } from 'effect'
import { Command } from 'foldkit'

// ❌ Bad
// Effect.map lifts the result Message but records nothing on the mapping chain,
// so Story/Scene resolve sees the child's raw Message.
const badCommands = Command.mapEffect(
  childCommand,
  Effect.map(childMessage => GotChildMessage({ childMessage })),
)

// ✅ Good
// mapMessages records the lift, so resolve can recover it in tests.
const goodCommands = Command.mapMessages(childCommands, message =>
  GotChildMessage({ message }),
)
