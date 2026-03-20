import { Array, Effect } from 'effect'
import { Command } from 'foldkit'

const [nextLogin, commands, maybeOutMessage] = Login.update(
  model.login,
  message,
)

const mappedCommands = Array.map(
  commands,
  Command.mapEffect(Effect.map(message => GotLoginMessage({ message }))),
)
