import { Option, Schema, String, pipe } from 'effect'
import type { Block } from 'foldkit'

import { ReplaceFilters } from './command'
import { ApplicationDefinition } from './definition'
import { DietListboxBlock, PeriodListboxBlock } from './model'
import { Diet, Period, routeToBrowseFields } from './route'

const selectionToParam = <A extends string>(
  maybeSelectedItem: Option.Option<string>,
  schema: Schema.Codec<A, A>,
): Option.Option<A> => {
  const decode = Schema.decodeUnknownOption(schema)

  return pipe(
    maybeSelectedItem,
    Option.filter(String.isNonEmpty),
    Option.flatMap(value => decode(value)),
  )
}

const foldDietListboxOutMessage = ApplicationDefinition.makeOutMessageFold(
  DietListboxBlock,
  {
    Selected: ({ value }) =>
      ApplicationDefinition.makeCommandsStep(model => {
        const fields = routeToBrowseFields(model.route)
        return [
          ReplaceFilters({
            ...fields,
            diet: selectionToParam(Option.some(value), Diet),
          }),
        ]
      }),
  },
)

export const DietListboxBinding = ApplicationDefinition.makeBinding(
  DietListboxBlock,
  {
    field: 'dietListbox',
    init: { contextToArgs: () => [{ id: 'diet-filter' }] },
  },
).withOutMessagePolicy({ fold: foldDietListboxOutMessage })

const foldPeriodListboxOutMessage = ApplicationDefinition.makeOutMessageFold(
  PeriodListboxBlock,
  {
    Selected: ({ value }) =>
      ApplicationDefinition.makeCommandsStep(model => {
        const fields = routeToBrowseFields(model.route)
        return [
          ReplaceFilters({
            ...fields,
            period: selectionToParam(Option.some(value), Period),
          }),
        ]
      }),
  },
)

export const PeriodListboxBinding = ApplicationDefinition.makeBinding(
  PeriodListboxBlock,
  {
    field: 'periodListbox',
    init: { contextToArgs: () => [{ id: 'period-filter' }] },
  },
).withOutMessagePolicy({ fold: foldPeriodListboxOutMessage })

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [DietListboxBinding, PeriodListboxBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
