import { Option } from 'effect'

import {
  GraduationYearListboxBlock,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

export const GraduationYearListboxBinding = makeRequiredFieldBinding(
  GraduationYearListboxBlock,
  {
    field: 'graduationYearListbox',
    init: {
      contextToArgs: entryId => [{ id: `${entryId}-graduation-year` }],
    },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(GraduationYearListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeGraduationYear: () => Option.some(value),
      })),
  }),
})

export const EducationEntryComposition = makeComposition({
  bindings: [GraduationYearListboxBinding],
})
