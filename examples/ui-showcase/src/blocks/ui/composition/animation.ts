import { AnimationBlock } from '@foldkit/ui/animation'

import { UiBlock, makeNoopStep } from '../definition'

const BaseAnimationDemoBinding = UiBlock.makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = UiBlock.makeOutMessageFold(AnimationBlock, {
  StartedLeaveAnimating: () =>
    BaseAnimationDemoBinding.requestWaitForLeaveSettlement(),
  TransitionedOut: makeNoopStep,
})

export const AnimationDemoBinding =
  BaseAnimationDemoBinding.withOutMessagePolicy({
    fold: foldAnimationDemoOutMessage,
  })
