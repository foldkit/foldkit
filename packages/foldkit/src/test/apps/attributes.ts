import { customElement } from '../../html/index.js'
import type { Attribute, Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import type * as Update from '../../update/index.js'

// MESSAGE

export const Message = defineMessageUnion({
  IgnoredInteraction: {},
})

export type Message = typeof Message.Type

// MODEL

export type Model = Readonly<{
  attribute: Attribute<Message>
  tagName?: string
}>

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    IgnoredInteraction: () => ({ model }),
  })

// VIEW

const TEST_ID = 'attribute-host'

export const testId = TEST_ID

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const attributes = [h.DataAttribute('testid', TEST_ID), model.attribute]
  if (model.tagName === undefined) {
    return h.div(attributes)
  } else {
    return customElement<Message>()(model.tagName)(attributes)
  }
}
