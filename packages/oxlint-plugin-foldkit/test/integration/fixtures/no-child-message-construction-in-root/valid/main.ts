import { Option } from 'effect'
import { Submodel, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { evo } from 'foldkit/struct'

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
  write: (model, child) => evo(model, { child: () => child }),
  toParentMessage: message => GotChildMessage({ message }),
})

export const update = (model: Model) => foldChildSave(model)

// CHILD VIEW

const saveButton = (h: HtmlBuilder<Child.Message>) =>
  h.button([h.OnClick(Child.Message.ClickedSave())])

export const view = Submodel.defineView<Child.Model, Child.Message>(
  (_model, h) => saveButton(h),
)

export const directMessageView = Submodel.defineView<
  Child.Model,
  Child.Message
>((_model, h) => h.button([h.OnClick(DirectChildMessage.ClickedSave())]))

export const nestedMainMessageView = Submodel.defineView<
  Child.Model,
  Child.Message
>((_model, h) => h.button([h.OnClick(NestedMainMessage.ClickedSave())]))

export const ownMessage = () => OwnMessage.ClickedSave()

export const aliasMessage = () => AliasMessage.ClickedSave()

export const localMessage = (Child: unknown) =>
  (Child as { Message: { ClickedSave: () => unknown } }).Message.ClickedSave()
