import { Array, Effect } from 'effect'

const [nextLogin, commands, maybeOutMessage] = Login.update(
  model.login,
  message,
)

const mappedCommands = Array.map(commands, command =>
  Effect.map(command, message => GotLoginMessage({ message })),
)
