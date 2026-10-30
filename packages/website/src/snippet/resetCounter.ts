import { Effect, Number, Schema } from 'effect'
import { Block, Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedDecrement: {},
  ClickedResetAfterDelay: {},
  CompletedWaitBeforeReset: {},
})

export const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
})

export class Application extends Block<Application>()('Application', {
  Model: Schema.Struct({ count: Schema.Number }),
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
        ClickedDecrement: model => ({
          model: modifyFields(model, { count: Number.decrement }),
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
            Effect.as(Message.CompletedWaitBeforeReset()),
          ),
      },

      view: (model, h) => ({
        title: `Count: ${model.count}`,
        body: h.div(
          [],
          [
            h.p([], [`${model.count}`]),
            h.button([h.OnClick(Message.ClickedIncrement())], ['+']),
            h.button([h.OnClick(Message.ClickedResetAfterDelay())], ['Reset']),
          ],
        ),
      }),
    }
  }),
)
