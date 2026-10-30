import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import * as Picker from './blockGenericFactory'

type Fruit = Readonly<{ name: string }>

const FRUITS: ReadonlyArray<Fruit> = [{ name: 'Apple' }, { name: 'Pear' }]

const FruitPicker = Picker.makeBlock<Fruit>()

export class Order extends Block<Order>()('Order', {
  Model: Schema.Struct({
    fruitPicker: FruitPicker,
    maybeFruitName: Schema.Option(Schema.String),
  }),
}) {}

export const OrderLive = Order.make(
  Effect.fn(function* () {
    const fruitPicker = yield* new FruitPicker('fruitPicker', {
      items: FRUITS,
      toLabel: fruit => fruit.name,
    })

    return {
      model: { fruitPicker, maybeFruitName: Option.none() },

      update: {
        ...fruitPicker.on({
          SelectedItem: (model, { index }) => ({
            model: modifyFields(model, {
              maybeFruitName: () =>
                Option.map(Array.get(FRUITS, index), fruit => fruit.name),
            }),
          }),
        }),
      },

      view: (model, h) => h.div([], [model.fruitPicker.view()]),
    }
  }),
).pipe(Layer.provide(FruitPicker.Live))
