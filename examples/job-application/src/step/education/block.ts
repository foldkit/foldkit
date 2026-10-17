import type { CalendarDate } from 'foldkit/calendar'

import { EffectsLayer } from './command'
import { EducationComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = EducationComposition.makeBlock({
  init: EducationComposition.makeInit(
    (today: CalendarDate, initialEntryId: string) => ({
      startup: { today, initialEntryId },
      model: { today },
    }),
  ),
  update,
  view,
  EffectsLayer,
})
