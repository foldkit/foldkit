import { Option, Schema, String, pipe } from 'effect'
import type { Block } from 'foldkit'

import { ReplaceFilters } from './command'
import { Application } from './definition'
import { Message } from './message'
import { DietListbox, PeriodListbox } from './model'
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

const foldDietListboxOutMessage = DietListbox.OutMessage.match({
  Selected: ({ value }) =>
    Application.step(model => {
      const fields = routeToBrowseFields(model.route)
      return {
        model,
        commands: [
          ReplaceFilters({
            ...fields,
            diet: selectionToParam(Option.some(value), Diet),
          }),
        ],
      }
    }),
})

export const DietListboxBinding = Application.bindChild(DietListbox, {
  field: 'dietListbox',
  parentMessage: Message.GotDietListboxMessage,
  init: { args: () => [{ id: 'diet-filter' }] },
  outMessage: { fold: foldDietListboxOutMessage },
})

const foldPeriodListboxOutMessage = PeriodListbox.OutMessage.match({
  Selected: ({ value }) =>
    Application.step(model => {
      const fields = routeToBrowseFields(model.route)
      return {
        model,
        commands: [
          ReplaceFilters({
            ...fields,
            period: selectionToParam(Option.some(value), Period),
          }),
        ],
      }
    }),
})

export const PeriodListboxBinding = Application.bindChild(PeriodListbox, {
  field: 'periodListbox',
  parentMessage: Message.GotPeriodListboxMessage,
  init: { args: () => [{ id: 'period-filter' }] },
  outMessage: { fold: foldPeriodListboxOutMessage },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [DietListboxBinding, PeriodListboxBinding],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
