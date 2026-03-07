import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// MESSAGE

// m() gives you a Message type with a callable constructor
const ClickedDecrement = m('ClickedDecrement')
const ClickedIncrement = m('ClickedIncrement')
const ClickedReset = m('ClickedReset')

const Message = S.Union(
  ClickedDecrement,
  ClickedIncrement,
  ClickedReset,
)
type Message = typeof Message.Type
