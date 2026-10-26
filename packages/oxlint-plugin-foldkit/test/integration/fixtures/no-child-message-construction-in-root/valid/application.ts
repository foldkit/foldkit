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

const foldChildSaveStep = Update.foldChildStep({
  update: Child.save,
  read: (model: Model) => Option.some(model.child),
  write: (model, child) => modifyFields(model, { child: () => child }),
  toParentMessage: message => GotChildMessage({ message }),
})

export const update = (model: Model) => foldChildSaveStep(model)

// CHILD VIEW

const saveButton = (h: HtmlBuilder<Child.Message>) =>
  h.button([h.OnClick(Child.Message.ClickedSave())])

const ChildViewNamespace = Block.makeNamespace('ChildView')
const childView = ChildViewNamespace.makeDefinition({
  Model: Child.Model,
  Message: Child.Message,
})
const ChildViewComposition = childView.makeComposition()

export const view = ChildViewComposition.makeView((_model, h) => saveButton(h))

const DirectMessageViewNamespace = Block.makeNamespace('DirectMessageView')
const directMessageDefinition = DirectMessageViewNamespace.makeDefinition({
  Model: Child.Model,
  Message: DirectChildMessage,
})
const DirectMessageComposition = directMessageDefinition.makeComposition()

export const directMessageView = DirectMessageComposition.makeView((_model, h) =>
  h.button([h.OnClick(DirectChildMessage.ClickedSave())]),
)

const NestedMainMessageViewNamespace = Block.makeNamespace(
  'NestedMainMessageView',
)
const nestedMainMessageDefinition = NestedMainMessageViewNamespace.makeDefinition({
  Model: Child.Model,
  Message: NestedMainMessage,
})
const NestedMainMessageComposition = nestedMainMessageDefinition.makeComposition()

export const nestedMainMessageView = NestedMainMessageComposition.makeView(
  (_model, h) => h.button([h.OnClick(NestedMainMessage.ClickedSave())]),
)

const TypedChildViewDefinition = Block.makeDefinition('TypedChildView', {
  Model: Child.Model,
  Message: Child.Message,
})
const TypedChildViewComposition = TypedChildViewDefinition.makeComposition()

export const typedChildView = TypedChildViewComposition.makeView((_model, h) =>
  h.button([h.OnClick(Child.Message.ClickedTypedChildViewSave())]),
)

export const childStep = childView.makeStep(model => ({
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
