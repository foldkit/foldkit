import { Schema } from 'effect'
import { Calendar } from 'foldkit'

import { ApplicationRoute } from './route'

export const Startup = Schema.Struct({
  route: ApplicationRoute,
  today: Calendar.CalendarDate,
})
export type Startup = typeof Startup.Type
