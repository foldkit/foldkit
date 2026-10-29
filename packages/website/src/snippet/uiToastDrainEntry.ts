import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

import { Toast } from '@foldkit/ui'

const ToastPayload = Schema.Struct({ body: Schema.String })
type ToastPayload = typeof ToastPayload.Type

const ToastBlock = Toast.makeBlock(ToastPayload)

const Model = Schema.Struct({ toast: ToastBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ RequestedShowToast: {} })
type Message = typeof Message.Type

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeNoopStep } = ApplicationDefinition

const foldToastOutMessage = ApplicationDefinition.makeOutMessageFold(
  ToastBlock,
  {
    DismissedToast: makeNoopStep,
  },
)
const ToastBinding = ApplicationDefinition.makeBinding(ToastBlock, {
  field: 'toast',
  init: {
    contextToArgs: () => Tuple.make({ id: 'notifications' }),
  },
}).withOutMessagePolicy({ fold: foldToastOutMessage })
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ToastBinding],
})

const init = ApplicationComposition.makeInit(() => ({ model: {} }))
const update = ApplicationComposition.makeUpdate({
  RequestedShowToast: ToastBinding.requestShow({ payload: { body: 'Saved' } }),
})

Story.story(
  update,
  Story.given(init().model),
  Story.message(Message.RequestedShowToast()),
  ToastBlock.test.drainEntry({
    binding: ToastBinding,
    entryId: 'notifications-entry-0',
  }),
  Story.Command.expectNone(),
)
