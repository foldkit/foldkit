import { Animation } from '@foldkit/ui'

import { makeBinding, makeNoopStep, makeOutMessageFold } from '../block'

const BaseAnimationDemoBinding = makeBinding(Animation.AnimationBlock, {
  field: 'animationDemo',
  init: { contextToArgs: () => [{ id: 'animation-demo' }] },
})

const foldAnimationDemoOutMessage = makeOutMessageFold(
  Animation.AnimationBlock,
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
