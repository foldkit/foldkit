import { Array, Schema } from 'effect'

import {
  type Document,
  type Html,
  type HtmlBuilder,
  createKeyedLazy,
} from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'
import { defineView } from '../../submodel/public.js'
import type * as Update from '../../update/index.js'

const Item = Schema.Struct({
  id: Schema.String,
  value: Schema.Number,
})
type Item = typeof Item.Type

// MODEL

export const Model = Schema.Struct({
  items: Schema.Array(Item),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  IncrementedItem: { id: Schema.String },
})
export type Message = typeof Message.Type

const lazyRow = createKeyedLazy()

const rowView = (item: Item, h: HtmlBuilder<Message>): Html =>
  h.li([h.Id(`row-${item.id}`)], [`${item.id}:${item.value}`])

const listView = defineView<{ items: ReadonlyArray<Item> }, Message>(
  (model, h) =>
    h.ul(
      [],
      Array.map(model.items, item => lazyRow(item.id, rowView, [item, h])),
    ),
)

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    IncrementedItem: ({ id }) => ({
      model: evo(model, {
        items: items =>
          Array.map(items, item =>
            item.id === id ? evo(item, { value: value => value + 1 }) : item,
          ),
      }),
    }),
  })

export const initialModel: Model = {
  items: [
    { id: 'item-1', value: 0 },
    { id: 'item-2', value: 0 },
  ],
}

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Outline lazy list test',
  body: h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.IncrementedItem({ id: 'item-1' }))],
        ['Increment item 1'],
      ),
      h.submodel({
        slotId: 'list',
        model: { items: model.items },
        view: listView,
        toParentMessage: message => message,
      }),
    ],
  ),
})
