import {
  type Attribute,
  type HtmlBuilder,
  type TaggedAttribute,
  childAttributes,
} from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({ ClickedControl: {} })
export type Message = typeof Message.Type

export const controlAttributes = (
  h: HtmlBuilder<Message>,
): ReadonlyArray<TaggedAttribute<Message>> => [
  h.Role('button'),
  h.OnClick(Message.ClickedControl()),
]

export const publishedControlAttributes = (h: HtmlBuilder<Message>) =>
  childAttributes(controlAttributes(h))

export const renderControl = (
  h: HtmlBuilder<Message>,
  attributes: ReadonlyArray<Attribute<Message>>,
) => h.button(attributes)
