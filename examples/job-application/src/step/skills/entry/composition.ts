import {
  ProficiencyRadioGroup,
  SkillsEntryDefinition,
  makeFieldsStep,
} from './definition'

const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const ProficiencyRadioGroupBinding = SkillsEntryDefinition.makeBinding(
  ProficiencyRadioGroup,
  {
    field: 'proficiencyRadioGroup',
    init: {
      contextToArgs: entryId => [{ id: proficiencyRadioGroupId(entryId) }],
    },
  },
).withOutMessagePolicy({
  fold: SkillsEntryDefinition.makeOutMessageFold(ProficiencyRadioGroup, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        proficiency: () => value,
      })),
  }),
})

export const SkillsEntryComposition = SkillsEntryDefinition.makeComposition({
  bindings: [ProficiencyRadioGroupBinding],
})
