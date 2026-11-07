import { Effect, Layer, Schema } from 'effect'
import { Block, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Toast } from '@foldkit/ui'

const ToastPayload = Schema.Struct({ body: Schema.String })
type ToastPayload = typeof ToastPayload.Type

const ToastBlock = Toast.makeBlock(ToastPayload)

const Model = Schema.Struct({ toast: ToastBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ RequestedShowToast: {} })
type Message = typeof Message.Type

export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

const {
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = ApplicationBlock

const ToastBinding = makeRequiredFieldBinding(ToastBlock, {
  field: 'toast',
  init: {
    contextToArgs: () => [{ id: 'notifications' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ToastBlock, {
    DismissedToast: makeNoopStep,
  }),
})
const ApplicationComposition = makeComposition({
  bindings: [ToastBinding],
})

const init = ApplicationComposition.makeInit(() => ({ model: {} }))
const update = ApplicationComposition.makeUpdate({
  RequestedShowToast: ToastBinding.requestShow({ payload: { body: 'Saved' } }),
})

const layer = ApplicationBlock.makeLayer({
  init,
  update,
}).pipe(Layer.provide(Toast.layer))

await Effect.runPromise(
  Story.story(
    { block: ApplicationBlock, layer },
    Story.init(),
    Story.message(Message.RequestedShowToast()),
    ToastBlock.test.drainEntry({
      binding: ToastBinding,
      entryId: 'notifications-entry-0',
    }),
    Story.Command.expectNone(),
  ),
)
