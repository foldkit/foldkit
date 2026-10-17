import { Option } from 'effect'
import type { CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { WorkHistoryEntryComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = WorkHistoryEntryComposition.makeBlock({
  init: WorkHistoryEntryComposition.makeInit(
    (entryId: string, today: CalendarDate) => ({
      startup: { entryId, today },
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
  ),
  update,
  view,
})
