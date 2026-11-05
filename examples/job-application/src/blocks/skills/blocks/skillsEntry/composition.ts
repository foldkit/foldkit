import {
  ProficiencyRadioGroup,
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'

const proficiencyRadioGroupId = (entryId: string): string =>
  `${entryId}-proficiency`

export const ProficiencyRadioGroupBinding = makeBinding(ProficiencyRadioGroup, {
  field: 'proficiencyRadioGroup',
  init: {
    contextToArgs: entryId => [{ id: proficiencyRadioGroupId(entryId) }],
  },
}).withOutMessagePolicy({
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
