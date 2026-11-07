import {
  ProficiencyRadioGroup,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const ProficiencyRadioGroupBinding = makeRequiredFieldBinding(
  ProficiencyRadioGroup,
  {
    field: 'proficiencyRadioGroup',
    init: {
      contextToArgs: entryId => [{ id: proficiencyRadioGroupId(entryId) }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(ProficiencyRadioGroup, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        proficiency: () => value,
      })),
  }),
})

export const SkillsEntryComposition = makeComposition({
  bindings: [ProficiencyRadioGroupBinding],
})
