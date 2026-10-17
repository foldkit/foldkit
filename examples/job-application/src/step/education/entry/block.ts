import { Option } from 'effect'
import { NotValidated } from 'foldkit/fieldValidation'

import { EducationEntryComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = EducationEntryComposition.makeBlock({
  init: EducationEntryComposition.makeInit((entryId: string) => ({
    startup: entryId,
    model: {
      id: entryId,
      school: NotValidated({ value: '' }),
      degree: NotValidated({ value: '' }),
      fieldOfStudy: NotValidated({ value: '' }),
      maybeGraduationYear: Option.none(),
      isCurrentlyEnrolled: false,
    },
  })),
  update,
  view,
})
