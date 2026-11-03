import { AnimationBlock } from '@foldkit/ui/animation'

import { UiDefinition, makeNoopStep } from '../definition'

const animationDemoBinding = UiDefinition.makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = UiDefinition.makeOutMessageFold(
  AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      animationDemoBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: makeNoopStep,
  },
)

export const AnimationDemoBinding = animationDemoBinding.withOutMessagePolicy({
  fold: foldAnimationDemoOutMessage,
})
