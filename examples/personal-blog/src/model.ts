import { Schema } from 'effect'

import { Counter } from './island'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  counter: Counter.Model,
})
export type Model = typeof Model.Type
