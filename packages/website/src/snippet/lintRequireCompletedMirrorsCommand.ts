import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const FocusInput = Command.define(
  'FocusInput',
  CompletedFocusInput,
)(focusInputEffect)

// ❌ Bad
// The ack reverses the Command name, so it mirrors no Command and the rule
// flags this Message, not the Command.define above.
const CompletedInputFocus = m('CompletedInputFocus')

// ✅ Good
// The ack repeats the Command name FocusInput verb-first.
const CompletedFocusInput = m('CompletedFocusInput')
