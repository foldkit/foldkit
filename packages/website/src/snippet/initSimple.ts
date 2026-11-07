import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({
  count: Schema.Number,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
})
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const { makeComposition } = ApplicationBlock

const ApplicationComposition = makeComposition()

const init = ApplicationComposition.makeInit(() => ({
  model: { count: 0 },
}))
