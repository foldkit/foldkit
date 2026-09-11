import { Effect } from 'effect'
import { Command } from 'foldkit'

// ❌ Bad
// Effect.map lifts the result Message but records nothing on the mapping chain,
// so Story/Scene resolve sees the child's raw Message.
const badCommand = Command.mapEffect(
  childCommand,
  Effect.map(message => Message.GotChildMessage({ message })),
)

// ✅ Good
// mapMessage records the lift, so resolve can recover it in tests.
const goodCommand = Command.mapMessage(childCommand, message =>
  Message.GotChildMessage({ message }),
)
