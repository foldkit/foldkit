import { Option } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { PersonalInfoComposition } from './composition'

export const init = PersonalInfoComposition.makeInit((today: CalendarDate) => ({
  childInitContext: today,
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
}))
