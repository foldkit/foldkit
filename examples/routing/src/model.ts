import { Schema } from 'effect'

import * as People from './page/people'
import { ApplicationRoute } from './route'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  peoplePage: People.PeopleBlock.Model,
})
export type Model = typeof Model.Type
