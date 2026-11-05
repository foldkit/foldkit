import { Option } from 'effect'

import {
  GraduationYearListboxBlock,
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'

export const GraduationYearListboxBinding = makeBinding(
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
