import { Effect, Number, Schema } from 'effect'
import { Command, Update } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// MODEL

export const Model = Schema.Struct({ count: Schema.Int })
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedResetAfterDelay: {},
  CompletedWaitBeforeReset: {},
})
export type Message = typeof Message.Type

// COMMAND

export const WaitBeforeReset = Command.define('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
})

export const WaitBeforeResetLayer = WaitBeforeReset.toLayer(
  Effect.succeed(() =>
    Effect.sleep('1 second').pipe(
      Effect.as(Message.CompletedWaitBeforeReset()),
    ),
  ),
)

export const EffectsLayer = WaitBeforeResetLayer

// INIT

export const init = () => ({
  model: Model.make({ count: 0 }),
})

// UPDATE

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: Number.increment }),
    }),
    ClickedResetAfterDelay: () => ({
      model,
      commands: [WaitBeforeReset()],
    }),
    CompletedWaitBeforeReset: () => ({
      model: modifyFields(model, { count: () => 0 }),
    }),
  }),
)

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Counter: ${model.count}`,
  body: h.main(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(Message.ClickedIncrement())], ['Increment']),
      h.button(
        [h.OnClick(Message.ClickedResetAfterDelay())],
        ['Reset after one second'],
      ),
    ],
  ),
})
