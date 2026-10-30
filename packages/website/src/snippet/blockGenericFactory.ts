import { Array, Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export type PickerArgs<Item> = Readonly<{
  items: ReadonlyArray<Item>
  toLabel: (item: Item) => string
}>

export const makeBlock = <Item>() => {
  class Picker extends Block<Picker, PickerArgs<Item>>()('Picker', {
    Model: Schema.Struct({ maybeSelectedIndex: Schema.Option(Schema.Number) }),
    Message: defineMessageUnion({ ClickedItem: { index: Schema.Number } }),
    OutMessage: defineMessageUnion({ SelectedItem: { index: Schema.Number } }),
  }) {}

  const PickerLive = Picker.make(
    Effect.fn(function* (_id, { items, toLabel }) {
      return {
        model: { maybeSelectedIndex: Option.none() },

        update: {
          ClickedItem: (model, { index }) => ({
            model: modifyFields(model, {
              maybeSelectedIndex: () => Option.some(index),
            }),
            outMessage: Picker.OutMessage.SelectedItem({ index }),
          }),
        },

        view: (_model, h) =>
          h.ul(
            [],
            Array.map(items, (item, index) =>
              h.li(
                [h.OnClick(Picker.Message.ClickedItem({ index }))],
                [toLabel(item)],
              ),
            ),
          ),
      }
    }),
  )

  return Object.assign(Picker, { Live: PickerLive })
}
