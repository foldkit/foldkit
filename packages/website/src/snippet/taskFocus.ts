import { Effect } from 'effect'
import { Task } from 'foldkit'

// Focus an element after form submission
const focusEmailInput = Task.focus('#email-input').pipe(
  Effect.ignore,
  Effect.as(Focused()),
)

// Generate a random integer between 1 and 6 (dice roll)
const rollDice = Task.randomInt(1, 7).pipe(
  Effect.map(value => RolledDice({ value })),
)
