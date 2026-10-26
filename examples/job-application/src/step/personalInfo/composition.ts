import { Option } from 'effect'
import type { Block } from 'foldkit'

import { DatePickerBlock } from '@foldkit/ui'

import {
  PersonalInfoDefinition,
  PronounsListboxBlock,
  makeFieldsStep,
  makeNoopStep,
} from './definition'

export const PronounsListboxBinding = PersonalInfoDefinition.makeBinding(
  PronounsListboxBlock,
  {
    field: 'pronouns',
    init: { contextToArgs: () => [{ id: 'pronouns' }] },
  },
).withOutMessagePolicy({
  fold: PersonalInfoDefinition.makeOutMessageFold(PronounsListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeSelectedPronoun: () => Option.some(value),
      })),
  }),
})

export const AvailableDatePickerBinding = PersonalInfoDefinition.makeBinding(
  DatePickerBlock,
  {
    field: 'availableDate',
    init: {
      contextToArgs: today => [{ id: 'available-date', today, minDate: today }],
    },
  },
).withOutMessagePolicy({
  fold: PersonalInfoDefinition.makeOutMessageFold(DatePickerBlock, {
    SelectedDate: ({ date }) =>
      makeFieldsStep(() => ({
        maybeAvailableDate: () => Option.some(date),
      })),
    ClearedDate: () =>
      makeFieldsStep(() => ({
        maybeAvailableDate: () => Option.none(),
      })),
    ChangedViewMonth: makeNoopStep,
  }),
})

export const PersonalInfoComposition = PersonalInfoDefinition.makeComposition({
  bindings: [PronounsListboxBinding, AvailableDatePickerBinding],
})
export type PersonalInfoViewBuilder = Block.ViewBuilderFor<
  typeof PersonalInfoComposition
>
