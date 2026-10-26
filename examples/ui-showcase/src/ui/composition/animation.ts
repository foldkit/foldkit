import { AnimationBlock } from '@foldkit/ui'

import { UiDefinition, makeNoopStep } from '../definition'

export const AnimationDemoBinding = UiDefinition.makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = UiDefinition.makeOutMessageFold(
  AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      AnimationDemoBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: makeNoopStep,
  },
)

export const AnimationDemoBindingWithOutMessagePolicy =
  AnimationDemoBinding.withOutMessagePolicy({
    fold: foldAnimationDemoOutMessage,
  })
