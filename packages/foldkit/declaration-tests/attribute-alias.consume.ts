import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'

import {
  type Message,
  type ObserveRequirements,
  ParentComposition,
  acceptWrapped,
  attributeElements,
  bindingMountView,
  mountedAttributes,
  mountedElements,
  publishedAttributes,
  staticAttributes,
} from './attribute-alias.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type PublishedInput = Expect<
  ReadonlyArray<ChildAttribute> extends ReturnType<typeof acceptWrapped>
    ? true
    : false
>
export type ElementResult = Expect<
  ReturnType<typeof attributeElements> extends Html ? true : false
>
export type MountedRequirements = Expect<
  Equal<
    ReturnType<typeof mountedAttributes>,
    ReadonlyArray<ChildAttribute<ObserveRequirements>>
  >
>

export const renderSharedAttributes = (h: HtmlBuilder<Message>) =>
  h.div(staticAttributes)
export const renderPublishedAttributes = (h: HtmlBuilder<Message>) =>
  h.button(publishedAttributes(h))
export const renderMountedAttributes = mountedElements
export const registeredBindingView = bindingMountView
export const authoredView = ParentComposition.makeView.withInputs<
  Readonly<{ attributes: ReadonlyArray<ChildAttribute<ObserveRequirements>> }>
>((_model, { attributes }, h) => h.div(attributes))
export const retainElementInput = (
  attributes: ReadonlyArray<Attribute<Message>>,
) => attributes
