import { type CalendarDate } from 'foldkit/calendar'

import { type Model } from './definition'
import * as Entry from './entry'

export const init = (today: CalendarDate, initialEntryId: string): Model => ({
  entries: [Entry.init(initialEntryId)],
  today,
})
