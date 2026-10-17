import type { CalendarDate } from 'foldkit/calendar'

import { EffectsLayer } from './command'
import { WorkHistoryComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = WorkHistoryComposition.makeBlock({
  init: WorkHistoryComposition.makeInit(
    (today: CalendarDate, initialEntryId: string) => ({
      startup: { today, initialEntryId },
      model: { today },
    }),
  ),
  update,
  view,
  EffectsLayer,
})
