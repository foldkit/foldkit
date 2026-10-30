import { Effect, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedResetAfterDelay: {},
  CompletedWaitBeforeReset: {},
})

export const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ count: Schema.Int }),
  Message,
  Command: [WaitBeforeReset],
}) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* () {
    return {
      model: { count: 0 },

      update: {
        ClickedIncrement: model => ({
          model: modifyFields(model, { count: Number.increment }),
        }),
        ClickedResetAfterDelay: model => ({
          model,
          commands: [WaitBeforeReset()],
        }),
        CompletedWaitBeforeReset: model => ({
          model: modifyFields(model, { count: () => 0 }),
        }),
      },

      commands: {
        WaitBeforeReset: () =>
          Effect.sleep('1 second').pipe(
            Effect.as(Application.Message.CompletedWaitBeforeReset()),
          ),
      },

      view: (model, h) => ({
        title: `Counter: ${model.count}`,
        body: h.main(
          [],
          [
            h.p([], [`Count: ${model.count}`]),
            h.button(
              [h.OnClick(Application.Message.ClickedIncrement())],
              ['Increment'],
            ),
            h.button(
              [h.OnClick(Application.Message.ClickedResetAfterDelay())],
              ['Reset after one second'],
            ),
          ],
        ),
      }),
    }
  }),
)
