import { Schema } from 'effect'

import { People } from './page'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  peoplePage: People.Model,
})

export type Model = typeof Model.Type
