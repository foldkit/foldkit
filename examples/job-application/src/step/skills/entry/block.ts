import { NotValidated } from 'foldkit/fieldValidation'

import { SkillsEntryComposition } from './composition'
import { update } from './update'
import { view } from './view'

export const block = SkillsEntryComposition.makeBlock({
  init: SkillsEntryComposition.makeInit((entryId: string) => ({
    startup: entryId,
    model: {
      id: entryId,
      name: NotValidated({ value: '' }),
      proficiency: 'Intermediate',
    },
  })),
  update,
  view,
})
