import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const TypedEmail = m('TypedEmail', { value: S.String })

const Message = S.Union(TypedEmail)
type Message = typeof Message.Type

const { input, Type, Value, Placeholder, OnInput } = html<Message>()

const emailInput = (email: string) =>
  input([
    Type('email'),
    Value(email),
    Placeholder('you@example.com'),
    OnInput(value => TypedEmail({ value })),
  ])
