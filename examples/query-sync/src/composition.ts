import { Option } from 'effect'
import type { Block } from 'foldkit'

import {
  makeBinding,
  makeCommandsStep,
  makeComposition,
  makeOutMessageFold,
} from './block'
import { ReplaceFilters } from './command'
import { DietListboxBlock, PeriodListboxBlock } from './model'
import { routeToBrowseFields } from './route'

const foldDietListboxOutMessage = makeOutMessageFold(DietListboxBlock, {
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
})

export const DietListboxBinding = makeBinding(DietListboxBlock, {
  field: 'dietListbox',
  init: { contextToArgs: () => [{ id: 'diet-filter' }] },
}).withOutMessagePolicy({ fold: foldDietListboxOutMessage })

const foldPeriodListboxOutMessage = makeOutMessageFold(PeriodListboxBlock, {
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
})

export const PeriodListboxBinding = makeBinding(PeriodListboxBlock, {
  field: 'periodListbox',
  init: { contextToArgs: () => [{ id: 'period-filter' }] },
}).withOutMessagePolicy({ fold: foldPeriodListboxOutMessage })

export const ApplicationComposition = makeComposition({
  bindings: [DietListboxBinding, PeriodListboxBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
