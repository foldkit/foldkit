import { Option } from 'effect'
import type { CalendarDate } from 'foldkit/calendar'
import { NotValidated } from 'foldkit/fieldValidation'

import { DatePicker } from '@foldkit/ui'

import { type Model } from './definition'

export const init = (entryId: string, today: CalendarDate): Model => ({
  id: entryId,
  company: NotValidated({ value: '' }),
  title: NotValidated({ value: '' }),
  startDate: DatePicker.init({ id: `${entryId}-start`, today }),
  maybeStartDate: Option.none(),
  endDate: DatePicker.init({ id: `${entryId}-end`, today }),
  maybeEndDate: Option.none(),
  isCurrentlyEmployed: false,
  description: '',
})
