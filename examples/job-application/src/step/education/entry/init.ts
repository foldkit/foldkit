import { Option } from 'effect'
import { NotValidated } from 'foldkit/fieldValidation'

import { GraduationYearListbox, type Model } from './definition'

export const init = (entryId: string): Model => ({
  id: entryId,
  school: NotValidated({ value: '' }),
  degree: NotValidated({ value: '' }),
  fieldOfStudy: NotValidated({ value: '' }),
  maybeGraduationYear: Option.none(),
  graduationYearListbox: GraduationYearListbox.init({
    id: `${entryId}-graduation-year`,
  }).model,
  isCurrentlyEnrolled: false,
})
