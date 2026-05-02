import { Option, Schema as S } from 'effect'
import type { Runtime } from 'foldkit'
import { m } from 'foldkit/message'

const Model = S.Struct({
  count: S.Number,
  startingCount: S.Option(S.Number),
})
type Model = typeof Model.Type

const Flags = S.Struct({
  savedCount: S.Option(S.Number),
})
type Flags = typeof Flags.Type

const ClickedIncrement = m('ClickedIncrement')
const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

const init: Runtime.ProgramInit<Model, Message, Flags> = flags => [
  {
    count: Option.getOrElse(flags.savedCount, () => 0),
    startingCount: flags.savedCount,
  },
  [],
]
