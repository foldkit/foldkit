import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const InputtedEmail = m('InputtedEmail', { value: S.String })

const Message = S.Union([InputtedEmail])
type Message = typeof Message.Type

// In a real app, this lives once at module level and is imported everywhere.
const h = html<Message>()

const emailInput = (email: string) =>
  h.input([
    h.Type('email'),
    h.Value(email),
    h.Placeholder('you@example.com'),
    h.OnInput(value => InputtedEmail({ value })),
  ])
