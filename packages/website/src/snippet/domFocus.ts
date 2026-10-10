import { Effect } from 'effect'
import { Command, Dom } from 'foldkit'

const FocusEmailInput = Command.define(
  'FocusEmailInput',
  {
    messages: [Focused],
  },
  Effect.succeed(() =>
    Dom.focus('#email-input').pipe(Effect.ignore, Effect.as(Focused())),
  ),
)
