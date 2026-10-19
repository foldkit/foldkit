// Pseudocode walkthrough of a custom leave Command. Fit it into the
// foldAnimationOutMessage from the basic example.
import { Effect, Schema } from 'effect'
import { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'

import { Animation } from '@foldkit/ui'

// The leave Command returns Animation's own EndedAnimation Message. It takes
// the generation of the leave that started it and puts that generation on the
// result, so Animation can tell this leave's settlement apart from a late
// result left over from an earlier enter. This one waits on a child panel
// instead of the Animation wrapper:
const WaitForPanelSettled = Command.define('WaitForPanelSettled', {
  args: { generation: Schema.Number },
  messages: [Animation.Message.EndedAnimation],
  execute: ({ generation }) =>
    Dom.waitForAnimationSettled('#drawer-panel').pipe(
      Effect.as(Animation.Message.EndedAnimation({ generation })),
    ),
})

// StartedLeaveAnimating carries the generation. Pass it straight to the Command:
const foldAnimationOutMessage = (
  outMessage: Animation.OutMessage,
  { liftCommand }: Update.FoldContext<Animation.Message, Message>,
) =>
  Animation.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    StartedLeaveAnimating:
      ({ generation }) =>
      model => ({
        model,
        commands: [liftCommand(WaitForPanelSettled({ generation }))],
      }),
    TransitionedOut: () => model => ({ model }),
  })
