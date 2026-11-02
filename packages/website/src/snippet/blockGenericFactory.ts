import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export type PickerViewInput<Item> = Readonly<{
  items: ReadonlyArray<Item>
  toLabel: (item: Item) => string
}>

const Model = Schema.Struct({
  maybeSelectedIndex: Schema.Option(Schema.Number),
})

const Message = defineMessageUnion({ ClickedItem: { index: Schema.Number } })

const OutMessage = defineMessageUnion({
  SelectedItem: { index: Schema.Number },
})

export const make = <Item>() => {
  class Picker extends Block<Picker, void, PickerViewInput<Item>>()(
    'Picker',
    { Model, Message, OutMessage },
    () => ({
      init: () => ({ maybeSelectedIndex: Option.none() }),

      update: {
        ClickedItem: (model, { index }) => ({
          model: modifyFields(model, {
            maybeSelectedIndex: () => Option.some(index),
          }),
          outMessage: OutMessage.SelectedItem({ index }),
        }),
      },

      view: (model, h, { items, toLabel }) =>
        h.ul(
          [],
          Array.map(items, (item, index) =>
            h.li(
              [
                h.AriaSelected(
                  Option.contains(model.maybeSelectedIndex, index),
                ),
                h.OnClick(Message.ClickedItem({ index })),
              ],
              [toLabel(item)],
            ),
          ),
        ),
    }),
  ) {}

  return Picker
}
