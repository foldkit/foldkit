import { AnimationBlock } from '@foldkit/ui/animation'

import { makeBinding, makeNoopStep, makeOutMessageFold } from '../block'

const BaseAnimationDemoBinding = makeBinding(AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = makeOutMessageFold(AnimationBlock, {
  StartedLeaveAnimating: () =>
    BaseAnimationDemoBinding.requestWaitForLeaveSettlement(),
  TransitionedOut: makeNoopStep,
})

export const AnimationDemoBinding =
  BaseAnimationDemoBinding.withOutMessagePolicy({
    fold: foldAnimationDemoOutMessage,
  })
