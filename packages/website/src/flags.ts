import { Schema } from 'effect'
import { Calendar } from 'foldkit'

import { Deployment } from './deployment'
import { ApiReference, ExampleDetail } from './page'

export const Flags = Schema.Struct({
  currentYear: Schema.Number,
  today: Calendar.CalendarDate,
  deployment: Deployment,
  maybeApiData: Schema.Option(ApiReference.ApiData),
  maybeExampleSources: Schema.Option(ExampleDetail.ExampleSources),
})
export type Flags = typeof Flags.Type
