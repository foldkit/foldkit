import { Schema as S } from 'effect'
import type { Runtime } from 'foldkit'
import { m } from 'foldkit/message'

const Model = S.Struct({
  count: S.Number,
})
type Model = typeof Model.Type

const ClickedIncrement = m('ClickedIncrement')
const ClickedDecrement = m('ClickedDecrement')

const Message = S.Union([ClickedIncrement, ClickedDecrement])
type Message = typeof Message.Type

const init: Runtime.ProgramInit<Model, Message> = () => [{ count: 0 }, []]
