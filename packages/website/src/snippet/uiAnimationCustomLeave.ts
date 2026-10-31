import { Effect, Layer, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import * as Dom from 'foldkit/dom'
import { defineMessageUnion } from 'foldkit/message'

import { Animation } from '@foldkit/ui'

const Message = defineMessageUnion({
  CompletedWaitForPanelSettled: { generation: Schema.Number },
})

// The Command carries the generation of the leave that started it, so
// Animation can tell this leave's settlement apart from a late result left
// over from an earlier enter
const WaitForPanelSettled = Command.define('WaitForPanelSettled', {
  args: { generation: Schema.Number },
  messages: [Message.CompletedWaitForPanelSettled],
})

export class Drawer extends Block<Drawer>()('Drawer', {
  Model: Schema.Struct({ animation: Animation.Animation }),
  Message,
  Command: [WaitForPanelSettled],
}) {}

export const DrawerLive = Drawer.make(
  Effect.fn(function* () {
    const animation = yield* new Animation.Animation('animation', {
      id: 'drawer',
    })

    return {
      model: { animation },

      update: {
        // When the panel settles, tell Animation that this leave finished
        CompletedWaitForPanelSettled: (model, { generation }) => ({
          model,
          messages: [
            model.animation.send(
              Animation.Animation.Message.RequestedFinish({ generation }),
            ),
          ],
        }),

        // Wait on a child panel instead of the Animation wrapper
        ...animation.on({
          StartedLeaveAnimating: (model, { generation }) => ({
            model,
            commands: [WaitForPanelSettled({ generation })],
          }),
        }),
      },

      commands: {
        WaitForPanelSettled: ({ generation }) =>
          Dom.waitForAnimationSettled('#drawer-panel').pipe(
            Effect.as(Message.CompletedWaitForPanelSettled({ generation })),
          ),
      },
    }
  }),
).pipe(Layer.provide(Animation.AnimationLive))
