import { Command } from 'foldkit'

// ❌ Bad
// Passing child Commands through without a Got*Message wrapper breaks the
// one-wrap-per-level Submodel convention.
const badCommands = Command.mapMessages(childCommands, message => message)

// ✅ Good
const goodCommands = Command.mapMessages(childCommands, message =>
  GotChildMessage({ message }),
)
