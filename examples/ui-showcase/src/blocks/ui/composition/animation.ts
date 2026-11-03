import { AnimationBlock } from '@foldkit/ui/animation'

import { UiDefinition, makeNoopStep } from '../definition'

const BaseAnimationDemoBinding = UiDefinition.makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = UiDefinition.makeOutMessageFold(
  AnimationBlock,
  {
    StartedLeaveAnimating: () =>
      BaseAnimationDemoBinding.requestWaitForLeaveSettlement(),
    TransitionedOut: makeNoopStep,
  },
)

export const AnimationDemoBinding =
  BaseAnimationDemoBinding.withOutMessagePolicy({
    fold: foldAnimationDemoOutMessage,
  })
