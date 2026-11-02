import { Array, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Picker from './blockGenericFactory'

type Fruit = Readonly<{ name: string }>

const FRUITS: ReadonlyArray<Fruit> = [{ name: 'Apple' }, { name: 'Pear' }]

const toFruitLabel = (fruit: Fruit): string => fruit.name

const FruitPicker = Picker.make<Fruit>()

export class Order extends Block<Order>()('Order', {
  Model: Schema.Struct({
    fruitPicker: FruitPicker,
    maybeFruitName: Schema.Option(Schema.String),
  }),
}) {}

export const OrderLive = Order.toLayer(() => ({
  init: () => ({
    fruitPicker: new FruitPicker('fruitPicker'),
    maybeFruitName: Option.none(),
  }),

  update: {
    ...FruitPicker.on({
      SelectedItem: (model, { index }) => ({
        model: modifyFields(model, {
          maybeFruitName: () =>
            Option.map(Array.get(FRUITS, index), toFruitLabel),
        }),
      }),
    }),
  },

  view: (model, h) =>
    h.div(
      [],
      [model.fruitPicker.view({ items: FRUITS, toLabel: toFruitLabel })],
    ),
})).pipe(Layer.provide(FruitPicker))
