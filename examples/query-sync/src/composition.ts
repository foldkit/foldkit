import { Option } from 'effect'
import type { Block } from 'foldkit'

import {
  makeCommandsStep,
  makeComposition,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { ReplaceFilters } from './command'
import { DietListboxBlock, PeriodListboxBlock } from './model'
import { routeToBrowseFields } from './route'

export const DietListboxBinding = makeRequiredFieldBinding(DietListboxBlock, {
  field: 'dietListbox',
  init: { contextToArgs: () => [{ id: 'diet-filter' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DietListboxBlock, {
    Selected: ({ value }) =>
      makeCommandsStep(model => {
        const fields = routeToBrowseFields(model.route)

        return [
          ReplaceFilters({
            ...fields,
            diet: value === 'All' ? Option.none() : Option.some(value),
          }),
        ]
      }),
  }),
})

export const PeriodListboxBinding = makeRequiredFieldBinding(
  PeriodListboxBlock,
  {
    field: 'periodListbox',
    init: { contextToArgs: () => [{ id: 'period-filter' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(PeriodListboxBlock, {
    Selected: ({ value }) =>
      makeCommandsStep(model => {
        const fields = routeToBrowseFields(model.route)

        return [
          ReplaceFilters({
            ...fields,
            period: value === 'All' ? Option.none() : Option.some(value),
          }),
        ]
      }),
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [DietListboxBinding, PeriodListboxBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
