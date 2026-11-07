import { Animation } from '@foldkit/ui'

import {
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from '../block'

const BaseAnimationDemoBinding = makeRequiredFieldBinding(
  Animation.AnimationBlock,
  {
    field: 'animationDemo',
    init: { contextToArgs: () => [{ id: 'animation-demo' }] },
  },
)

export const AnimationDemoBinding =
  BaseAnimationDemoBinding.withOutMessagePolicy({
    fold: makeOutMessageFold(Animation.AnimationBlock, {
      StartedLeaveAnimating: () =>
        BaseAnimationDemoBinding.requestWaitForLeaveSettlement(),
      TransitionedOut: makeNoopStep,
    }),
  })
