// Pseudocode walkthrough of a custom leave Command. Fit it into the
// foldAnimationOutMessage from the basic example.
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import * as Dom from 'foldkit/dom'

import { Animation } from '@foldkit/ui'

const AnimationExampleDefinition = Block.makeDefinition('AnimationExample', {
  Model,
  Message,
})

const { makeCommandsStep, makeNoopStep } = AnimationExampleDefinition

// The leave Command returns Animation's own EndedAnimation Message. It takes
// the generation of the leave that started it and puts that generation on the
// result, so Animation can tell this leave's settlement apart from a late
// result left over from an earlier enter. This one waits on a child panel
// instead of the Animation wrapper:
const WaitForPanelSettled = AnimationExampleDefinition.makeCommand(
  'WaitForPanelSettled',
  {
    args: { generation: Schema.Number },
    messages: [Animation.AnimationBlock.Message.EndedAnimation],
    handler: function* () {
      return ({ generation }) =>
        Dom.waitForAnimationSettled('#drawer-panel').pipe(
          Effect.as(
            Animation.AnimationBlock.Message.EndedAnimation({ generation }),
          ),
        )
    },
  },
)

// StartedLeaveAnimating carries the generation. Pass it straight to the Command:
const foldAnimationOutMessage = AnimationExampleDefinition.makeOutMessageFold(
  Animation.AnimationBlock,
  {
    StartedLeaveAnimating: ({ generation }, { liftCommand }) =>
      makeCommandsStep(() => [
        liftCommand(WaitForPanelSettled({ generation })),
      ]),
    TransitionedOut: makeNoopStep,
  },
)
