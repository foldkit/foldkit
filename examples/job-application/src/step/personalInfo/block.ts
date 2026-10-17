import { Option } from 'effect'
import type { CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { EffectsLayer } from './command'
import { PersonalInfoComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = PersonalInfoComposition.makeBlock({
  init: PersonalInfoComposition.makeInit((today: CalendarDate) => ({
    startup: today,
    model: {
      firstName: NotValidated({ value: '' }),
      lastName: NotValidated({ value: '' }),
      email: NotValidated({ value: '' }),
      emailValidationId: 0,
      phone: NotValidated({ value: '' }),
      maybeSelectedPronoun: Option.none(),
      customPronouns: '',
      portfolioUrl: NotValidated({ value: '' }),
      maybeAvailableDate: Option.none(),
    },
  })),
  update,
  view,
  EffectsLayer,
})
