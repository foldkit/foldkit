import { Option } from 'effect'
import type { CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { WorkHistoryEntryComposition } from './composition'

export const init = WorkHistoryEntryComposition.makeInit(
  (entryId: string, today: CalendarDate) => ({
    childInitContext: { entryId, today },
    model: {
      id: entryId,
      company: NotValidated({ value: '' }),
      title: NotValidated({ value: '' }),
      maybeStartDate: Option.none(),
      maybeEndDate: Option.none(),
      isCurrentlyEmployed: false,
      description: '',
    },
  }),
)
