import { Schema } from 'effect'
import { Calendar } from 'foldkit'

import * as ApiReference from './blocks/apiReference/domain'
import * as ExampleDetail from './blocks/exampleDetail/domain'
import { Deployment } from './deployment'

export const Flags = Schema.Struct({
  currentYear: Schema.Number,
  today: Calendar.CalendarDate,
  deployment: Deployment,
  maybeApiData: Schema.Option(ApiReference.ApiData),
  maybeExampleSources: Schema.Option(ExampleDetail.ExampleSources),
})
export type Flags = typeof Flags.Type
