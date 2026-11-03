import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({
  count: Schema.Number,
  startingCount: Schema.Option(Schema.Number),
})
type Model = typeof Model.Type

const Flags = Schema.Struct({
  savedCount: Schema.Option(Schema.Number),
})
type Flags = typeof Flags.Type

const Message = defineMessageUnion({
  ClickedIncrement: {},
})
type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([Flags]),
  Model,
  Message,
})

const ApplicationComposition = ApplicationDefinition.makeComposition()

const init = ApplicationComposition.makeInit(flags => ({
  model: {
    count: Option.getOrElse(flags.savedCount, () => 0),
    startingCount: flags.savedCount,
  },
}))
