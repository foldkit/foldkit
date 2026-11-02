import { Effect, Schema, Tuple } from 'effect'
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

const AnimationExampleKey = Symbol('AnimationExample')

const AnimationExampleDefinition = Block.makeDefinition('AnimationExample', {
  key: AnimationExampleKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
})
const { makeCommandsStep, makeNoopStep } = AnimationExampleDefinition

const WaitForPanelSettled = AnimationExampleDefinition.makeCommand(
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

const AnimationBinding = AnimationExampleDefinition.makeBinding(
  Animation.AnimationBlock,
  {
    field: 'animation',
    init: { contextToArgs: () => Tuple.make({ id: 'drawer' }) },
  },
)

const foldAnimationOutMessage = AnimationExampleDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: ({ generation }) =>
      makeCommandsStep(() => [WaitForPanelSettled({ generation })]),
    TransitionedOut: makeNoopStep,
  },
)
const AnimatedPanelBinding = AnimationBinding.withOutMessagePolicy({
  fold: foldAnimationOutMessage,
})
const AnimationExampleComposition = AnimationExampleDefinition.makeComposition({
  bindings: [AnimatedPanelBinding],
})
const init = AnimationExampleComposition.makeInit(() => ({ model: {} }))
const update = AnimationExampleComposition.makeUpdate({
  ClickedHidePanel: AnimationBinding.requestHide(),
  // The parent Command reports its own fact. The operation keeps Animation's
  // generation check and routes any TransitionedOut through the Binding policy.
  CompletedWaitForPanelSettled: (model, { generation }) =>
    AnimationBinding.requestFinish(generation)(model),
})

export const ApplicationBlock = AnimationExampleDefinition.makeBlock(
  Effect.gen(function* () {
    const animation = yield* AnimatedPanelBinding

    return {
      children: [animation],
      init,
      update,
      EffectsLayer: WaitForPanelSettled.layer,
    }
  }),
).provide(Animation.layer)
