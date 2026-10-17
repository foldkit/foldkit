import { NotValidated } from 'foldkit/fieldValidation'

import { type Model, ProficiencyRadioGroup } from './definition'

export const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const init = (entryId: string): Model => ({
  id: entryId,
  name: NotValidated({ value: '' }),
  proficiency: 'Intermediate',
  proficiencyRadioGroup: ProficiencyRadioGroup.init({
    id: proficiencyRadioGroupId(entryId),
  }).model,
})
