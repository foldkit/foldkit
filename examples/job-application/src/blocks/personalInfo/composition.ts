import { Option } from 'effect'
import type { Block } from 'foldkit'

import { DatePicker } from '@foldkit/ui'

import {
  PronounsListboxBlock,
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} from './block'

export const PronounsBinding = makeBinding(PronounsListboxBlock, {
  field: 'pronouns',
  init: { contextToArgs: () => [{ id: 'pronouns' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PronounsListboxBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeSelectedPronoun: () => Option.some(value),
      })),
  }),
})

export const AvailableDateBinding = makeBinding(DatePicker.DatePickerBlock, {
  field: 'availableDate',
  init: {
    contextToArgs: today => [{ id: 'available-date', today, minDate: today }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DatePicker.DatePickerBlock, {
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

export const PersonalInfoComposition = makeComposition({
  bindings: [PronounsBinding, AvailableDateBinding],
})
export type PersonalInfoViewBuilder = Block.ViewBuilderFor<
  typeof PersonalInfoComposition
>
