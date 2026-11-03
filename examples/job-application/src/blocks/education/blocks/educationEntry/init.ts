import { Option } from 'effect'
import { NotValidated } from 'foldkit/fieldValidation'

import { EducationEntryComposition } from './composition'

export const init = EducationEntryComposition.makeInit((entryId: string) => ({
  childInitContext: entryId,
  model: {
    id: entryId,
    school: NotValidated({ value: '' }),
    degree: NotValidated({ value: '' }),
    fieldOfStudy: NotValidated({ value: '' }),
    maybeGraduationYear: Option.none(),
    isCurrentlyEnrolled: false,
  },
}))
