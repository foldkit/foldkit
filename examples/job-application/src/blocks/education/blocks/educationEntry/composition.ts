import { Option } from 'effect'

import {
  EducationEntryBlock,
  GraduationYearListboxBlock,
  makeFieldsStep,
} from './definition'

export const GraduationYearListboxBinding = EducationEntryBlock.makeBinding(
  GraduationYearListboxBlock,
  {
    field: 'graduationYearListbox',
    init: {
      contextToArgs: entryId => [{ id: `${entryId}-graduation-year` }],
    },
  },
).withOutMessagePolicy({
  fold: EducationEntryBlock.makeOutMessageFold(GraduationYearListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeGraduationYear: () => Option.some(value),
      })),
  }),
})

export const EducationEntryComposition = EducationEntryBlock.makeComposition({
  bindings: [GraduationYearListboxBinding],
})
