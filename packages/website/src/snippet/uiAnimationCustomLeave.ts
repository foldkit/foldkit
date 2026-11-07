import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'

const Model = Schema.Struct({ animation: Animation.AnimationBlock.Model })
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
  InitArgs: Schema.Tuple([]),
})
const {
  makeCommandsStep,
  makeNoopStep,
  makeCommand,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = AnimationExampleBlock

const WaitForPanelSettled = makeCommand('WaitForPanelSettled', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForPanelSettled],
  handler: function* () {
    return ({ generation }) =>
      Dom.waitForAnimationSettled('#drawer-panel').pipe(
        Effect.as(Message.CompletedWaitForPanelSettled({ generation })),
      )
  },
})

const AnimationBinding = makeRequiredFieldBinding(Animation.AnimationBlock, {
  field: 'animation',
  init: { contextToArgs: () => [{ id: 'drawer' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Animation.AnimationBlock, {
    StartedLeaveAnimating: ({ generation }) =>
      makeCommandsStep(() => [WaitForPanelSettled({ generation })]),
    TransitionedOut: makeNoopStep,
  }),
})
const AnimationExampleComposition = makeComposition({
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

export const layer = AnimationExampleBlock.makeLayer({
  init,
  update,
  EffectsLayer: WaitForPanelSettled.layer,
}).pipe(Layer.provide(Animation.layer))
