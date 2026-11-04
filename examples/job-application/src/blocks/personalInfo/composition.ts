import { Option } from 'effect'
import type { Block } from 'foldkit'

import { DatePickerBlock } from '@foldkit/ui/datePicker'

import {
  PersonalInfoBlock,
  PronounsListboxBlock,
  makeFieldsStep,
  makeNoopStep,
} from './definition'

export const PronounsBinding = PersonalInfoBlock.makeBinding(
  PronounsListboxBlock,
  {
    field: 'pronouns',
    init: { contextToArgs: () => [{ id: 'pronouns' }] },
  },
).withOutMessagePolicy({
  fold: PersonalInfoBlock.makeOutMessageFold(PronounsListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeSelectedPronoun: () => Option.some(value),
      })),
  }),
})

export const AvailableDateBinding = PersonalInfoBlock.makeBinding(
  DatePickerBlock,
  {
    field: 'availableDate',
    init: {
      contextToArgs: today => [{ id: 'available-date', today, minDate: today }],
    },
  },
).withOutMessagePolicy({
  fold: PersonalInfoBlock.makeOutMessageFold(DatePickerBlock, {
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

export const PersonalInfoComposition = PersonalInfoBlock.makeComposition({
  bindings: [PronounsBinding, AvailableDateBinding],
})
export type PersonalInfoViewBuilder = Block.ViewBuilderFor<
  typeof PersonalInfoComposition
>
