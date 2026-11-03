import { NotValidated } from 'foldkit/fieldValidation'

import { SkillsEntryComposition } from './composition'

export const init = SkillsEntryComposition.makeInit((entryId: string) => ({
  childInitContext: entryId,
  model: {
    id: entryId,
    name: NotValidated({ value: '' }),
    proficiency: 'Intermediate',
  },
}))
