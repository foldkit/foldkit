import { Schema } from 'effect'
import { evo } from 'foldkit/struct'

const Model = Schema.Struct({
  count: Schema.Number,
  status: Schema.Literals(['Idle', 'Counting']),
})
type Model = typeof Model.Type

const model: Model = { count: 0, status: 'Idle' }

const nextModel = evo(model, {
  count: count => count + 1,
  status: () => 'Counting',
})
