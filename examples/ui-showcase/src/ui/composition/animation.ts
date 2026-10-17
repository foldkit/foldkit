import { Update } from 'foldkit'

import { Animation } from '@foldkit/ui'
import { defaultLeaveCommand } from '@foldkit/ui/animation'

import { Ui } from '../definition'
import { Message } from '../message'

const foldAnimationDemoOutMessage = (
  outMessage: typeof Animation.OutMessage.Type,
  { liftCommand }: Update.FoldContext<typeof Animation.Message.Type, Message>,
) =>
  Animation.OutMessage.match(outMessage, {
    StartedLeaveAnimating: () =>
      Ui.step(model => ({
        model,
        commands: [liftCommand(defaultLeaveCommand(model.animationDemo))],
      })),
    TransitionedOut: () => Ui.step(model => ({ model })),
  })

export const AnimationDemoBinding = Ui.bindChild(Animation.block, {
  field: 'animationDemo',
  parentMessage: Message.GotAnimationDemoMessage,
  init: { args: () => [{ id: 'animation-demo' }] },
  outMessage: { fold: foldAnimationDemoOutMessage },
})
