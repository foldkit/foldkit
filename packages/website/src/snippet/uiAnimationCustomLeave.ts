import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { defineMessageUnion } from 'foldkit/message'

import { AnimationBlock, layer as AnimationLayer } from '@foldkit/ui/animation'

const Model = Schema.Struct({ animation: AnimationBlock.Model })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedHidePanel: {},
  CompletedWaitForPanelSettled: { generation: Schema.Number },
})
type Message = typeof Message.Type

export const AnimationExampleKey = Symbol('AnimationExample')

export const AnimationExampleBlock = Block.make('AnimationExample', {
  key: AnimationExampleKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const { makeCommandsStep, makeNoopStep } = AnimationExampleBlock

const WaitForPanelSettled = AnimationExampleBlock.makeCommand(
  'WaitForPanelSettled',
  {
    args: { generation: Schema.Number },
    messages: [Message.CompletedWaitForPanelSettled],
    handler: function* () {
      return ({ generation }) =>
        Dom.waitForAnimationSettled('#drawer-panel').pipe(
          Effect.as(Message.CompletedWaitForPanelSettled({ generation })),
        )
    },
  },
)

const foldAnimationOutMessage = AnimationExampleBlock.makeOutMessageFold(
  AnimationBlock,
  {
    StartedLeaveAnimating: ({ generation }) =>
      makeCommandsStep(() => [WaitForPanelSettled({ generation })]),
    TransitionedOut: makeNoopStep,
  },
)
const AnimationBinding = AnimationExampleBlock.makeBinding(AnimationBlock, {
  field: 'animation',
  init: { contextToArgs: () => [{ id: 'drawer' }] },
}).withOutMessagePolicy({
  fold: foldAnimationOutMessage,
})
const AnimationExampleComposition = AnimationExampleBlock.makeComposition({
  bindings: [AnimationBinding],
})
const init = AnimationExampleComposition.makeInit(() => ({ model: {} }))
const update = AnimationExampleComposition.makeUpdate({
  ClickedHidePanel: AnimationBinding.requestHide(),
  // The parent Command reports its own fact. The operation keeps Animation's
  // generation check and routes any TransitionedOut through the Binding policy.
  CompletedWaitForPanelSettled: (model, { generation }) =>
    AnimationBinding.requestFinish(generation)(model),
})

export const layer = AnimationExampleBlock.makeLayer(
  Effect.gen(function* () {
    const animation = yield* AnimationBinding

    return {
      children: [animation],
      init,
      update,
      EffectsLayer: WaitForPanelSettled.layer,
    }
  }),
).pipe(Layer.provide(AnimationLayer))
