import { Option, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Child } from './child'
import { Message as NestedMainMessage } from './child/main'
import { Message as DirectChildMessage } from './child/message'
import { GotChildMessage, Message as OwnMessage } from './message.js'
import { Model } from './model'
import { Message as AliasMessage } from '@/message'

// UPDATE

const foldChildSave = Update.foldChildStep({
  update: Child.save,
  read: (model: Model) => Option.some(model.child),
  write: (model, child) => modifyFields(model, { child: () => child }),
  toParentMessage: message => GotChildMessage({ message }),
})

export const update = (model: Model) => foldChildSave(model)

// CHILD VIEW

const saveButton = (h: HtmlBuilder<Child.Message>) =>
  h.button([h.OnClick(Child.Message.ClickedSave())])

const ChildView = Block.define('ChildView')
const childView = ChildView.define({
  Model: Child.Model,
  Message: Child.Message,
})
const ChildViewComposition = childView.makeComposition()

export const view = ChildViewComposition.makeView((_model, h) => saveButton(h))

const DirectMessageView = Block.define('DirectMessageView')
const directMessageDefinition = DirectMessageView.define({
  Model: Child.Model,
  Message: DirectChildMessage,
})
const DirectMessageComposition = directMessageDefinition.makeComposition()

export const directMessageView = DirectMessageComposition.makeView((_model, h) =>
  h.button([h.OnClick(DirectChildMessage.ClickedSave())]),
)

const NestedMainMessageView = Block.define('NestedMainMessageView')
const nestedMainMessageDefinition = NestedMainMessageView.define({
  Model: Child.Model,
  Message: NestedMainMessage,
})
const NestedMainMessageComposition = nestedMainMessageDefinition.makeComposition()

export const nestedMainMessageView = NestedMainMessageComposition.makeView(
  (_model, h) => h.button([h.OnClick(NestedMainMessage.ClickedSave())]),
)

const TypedChildView = Block.define('TypedChildView', {
  Model: Child.Model,
  Message: Child.Message,
})
const TypedChildViewComposition = TypedChildView.makeComposition()

export const typedChildView = TypedChildViewComposition.makeView((_model, h) =>
  h.button([h.OnClick(Child.Message.ClickedTypedChildViewSave())]),
)

export const childStep = childView.step(model => ({
  model,
  message: Child.Message.ClickedStepSave(),
}))

export type ChildMessage = typeof Child.Message.Type

export const isClickedSave = Schema.is(Child.Message.ClickedSave)

export const ownMessage = () => OwnMessage.ClickedSave()

export const aliasMessage = () => AliasMessage.ClickedSave()

export const localMessage = (Child: unknown) =>
  (Child as { Message: { ClickedSave: () => unknown } }).Message.ClickedSave()

let mutableChildMessage = Child.Message

export const mutableMessage = () => mutableChildMessage.ClickedSave()

export const computedMessage = () => Child['Message'].ClickedSave()
