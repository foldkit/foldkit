import { Array, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

export const Model = Schema.Struct({
  selectedItemIds: Schema.Array(Schema.String),
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedItem: { itemId: Schema.String, isExtendingSelection: Schema.Boolean },
})

export type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  selectedItemIds: ['Apple'],
}

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ClickedItem: ({ itemId, isExtendingSelection }) => {
      if (isExtendingSelection) {
        return {
          model: modifyFields(model, { selectedItemIds: Array.append(itemId) }),
        }
      } else {
        return {
          model: modifyFields(model, { selectedItemIds: () => [itemId] }),
        }
      }
    },
  })

// VIEW

const ITEM_IDS = ['Apple', 'Banana']

export const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      ...Array.map(ITEM_IDS, itemId =>
        h.keyed('button')(
          itemId,
          [
            h.OnClick(({ metaKey, ctrlKey }) =>
              Message.ClickedItem({
                itemId,
                isExtendingSelection: metaKey || ctrlKey,
              }),
            ),
          ],
          [itemId],
        ),
      ),
      h.span(
        [h.AriaLabel('Selected items')],
        [Array.join(model.selectedItemIds, ', ')],
      ),
    ],
  )
