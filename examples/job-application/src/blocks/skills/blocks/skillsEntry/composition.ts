import {
  ProficiencyRadioGroup,
  SkillsEntryBlock,
  makeFieldsStep,
} from './definition'

const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const ProficiencyRadioGroupBinding = SkillsEntryBlock.makeBinding(
  ProficiencyRadioGroup,
  {
    field: 'proficiencyRadioGroup',
    init: {
      contextToArgs: entryId => [{ id: proficiencyRadioGroupId(entryId) }],
    },
  },
).withOutMessagePolicy({
  fold: SkillsEntryBlock.makeOutMessageFold(ProficiencyRadioGroup, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        proficiency: () => value,
      })),
  }),
})

export const SkillsEntryComposition = SkillsEntryBlock.makeComposition({
  bindings: [ProficiencyRadioGroupBinding],
})
