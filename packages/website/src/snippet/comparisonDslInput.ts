import { Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const InputtedEmail = m('InputtedEmail', { value: S.String })

const Message = S.Union(InputtedEmail)
type Message = typeof Message.Type

// In a real app, this destructure lives once in html.ts and is imported everywhere.
const { input, Type, Value, Placeholder, OnInput } = html<Message>()

const emailInput = (email: string) =>
  input([
    Type('email'),
    Value(email),
    Placeholder('you@example.com'),
    OnInput(value => InputtedEmail({ value })),
  ])
