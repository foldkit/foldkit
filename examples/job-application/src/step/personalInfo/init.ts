import { Option } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { DatePicker } from '@foldkit/ui'

import { type Model, PronounsListbox } from './definition'

export const init = (today: CalendarDate): Model => ({
  firstName: NotValidated({ value: '' }),
  lastName: NotValidated({ value: '' }),
  email: NotValidated({ value: '' }),
  emailValidationId: 0,
  phone: NotValidated({ value: '' }),
  pronouns: PronounsListbox.init({ id: 'pronouns' }).model,
  maybeSelectedPronoun: Option.none(),
  customPronouns: '',
  portfolioUrl: NotValidated({ value: '' }),
  availableDate: DatePicker.init({
    id: 'available-date',
    today,
    minDate: today,
  }),
  maybeAvailableDate: Option.none(),
})
