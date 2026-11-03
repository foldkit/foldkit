import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

import {
  layer as ToastLayer,
  makeBlock as makeToastBlock,
} from '@foldkit/ui/toast'

const ToastPayload = Schema.Struct({ body: Schema.String })
type ToastPayload = typeof ToastPayload.Type

const ToastBlock = makeToastBlock(ToastPayload)

const Model = Schema.Struct({ toast: ToastBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({ RequestedShowToast: {} })
type Message = typeof Message.Type

const ApplicationKey = Symbol('Application')

const ApplicationDefinition = Block.makeDefinition('Application', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
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
    contextToArgs: () => [{ id: 'notifications' }],
  },
}).withOutMessagePolicy({ fold: foldToastOutMessage })
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ToastBinding],
})

const init = ApplicationComposition.makeInit(() => ({ model: {} }))
const update = ApplicationComposition.makeUpdate({
  RequestedShowToast: ToastBinding.requestShow({ payload: { body: 'Saved' } }),
})

const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const toast = yield* ToastBinding

    return { children: [toast], init, update }
  }),
).provide(ToastLayer)

await Effect.runPromise(
  Story.story(
    ApplicationBlock,
    Story.init(),
    Story.message(Message.RequestedShowToast()),
    ToastBlock.test.drainEntry({
      binding: ToastBinding,
      entryId: 'notifications-entry-0',
    }),
    Story.Command.expectNone(),
  ),
)
