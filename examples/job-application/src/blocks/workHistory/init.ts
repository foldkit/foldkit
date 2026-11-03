import { type CalendarDate } from 'foldkit/calendar'

import { WorkHistoryComposition } from './composition'

export const init = WorkHistoryComposition.makeInit(
  (today: CalendarDate, initialEntryId: string) => ({
    childInitContext: { today, initialEntryId },
    model: { today },
  }),
)
