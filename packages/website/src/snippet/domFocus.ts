import { Effect } from 'effect'
import { Command, Dom } from 'foldkit'

const FocusEmailInput = Command.define('FocusEmailInput', Focused)

const focusEmailInput = FocusEmailInput(
  Dom.focus('#email-input').pipe(Effect.ignore, Effect.as(Focused())),
)
