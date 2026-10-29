import { Schema } from 'effect'

import { Flags } from './flags'
import { ApplicationRoute } from './route'

export const ChildInitContext = Schema.Struct({
  route: ApplicationRoute,
  today: Flags.fields.today,
  maybeApiData: Flags.fields.maybeApiData,
  maybeExampleSources: Flags.fields.maybeExampleSources,
})
export type ChildInitContext = typeof ChildInitContext.Type
