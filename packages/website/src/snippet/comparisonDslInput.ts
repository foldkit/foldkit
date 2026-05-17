import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const InputtedEmail = m('InputtedEmail', { value: S.String })

const Message = S.Union([InputtedEmail])
type Message = typeof Message.Type

const emailInput = (email: string) => {
  const h = html<Message>()

  return h.input([
    h.Type('email'),
    h.Value(email),
    h.Placeholder('you@example.com'),
    h.OnInput(value => InputtedEmail({ value })),
  ])
}
