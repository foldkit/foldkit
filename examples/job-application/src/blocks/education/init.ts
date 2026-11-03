import { type CalendarDate } from 'foldkit/calendar'

import { EducationComposition } from './composition'

export const init = EducationComposition.makeInit(
  (today: CalendarDate, initialEntryId: string) => ({
    childInitContext: { today, initialEntryId },
    model: { today },
  }),
)
