import { Schema } from 'effect'

import * as Counter from './island'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  counter: Counter.CounterBlock.Model,
})
export type Model = typeof Model.Type
