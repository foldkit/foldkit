import { Effect } from 'effect'
import { Command, Task } from 'foldkit'

const FocusEmailInput = Command.define('FocusEmailInput')
const RollDice = Command.define('RollDice')

const focusEmailInput = FocusEmailInput(
  Task.focus('#email-input').pipe(Effect.ignore, Effect.as(Focused())),
)

const rollDice = RollDice(
  Task.randomInt(1, 7).pipe(Effect.map(value => RolledDice({ value }))),
)
