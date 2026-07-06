import { Command } from 'foldkit'

// ❌ Bad
// The mapper wraps child output in a plain parent Message, not a Got*Message,
// so this Submodel level never records the wrap.
const badCommands = Command.mapMessages(childCommands, message =>
  ForwardedChildMessage({ message }),
)

// ✅ Good
const goodCommands = Command.mapMessages(childCommands, message =>
  GotChildMessage({ message }),
)
