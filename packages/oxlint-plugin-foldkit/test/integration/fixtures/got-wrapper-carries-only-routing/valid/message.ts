import { Schema as S } from 'effect'
import { m } from 'foldkit/message'
import { Counter } from './counter'

// MESSAGE

export const GotCounterMessage = m('GotCounterMessage', {
  id: S.String,
  message: Counter.Message,
})
