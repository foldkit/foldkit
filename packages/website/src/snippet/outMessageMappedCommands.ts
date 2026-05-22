import { Array, Effect } from 'effect'
import { Command } from 'foldkit'

const [nextLogin, commands, maybeOutMessage] = Login.update(
  model.login,
  message,
)

const mappedCommands = Command.mapMessages(commands, message =>
  GotLoginMessage({ message }),
)
