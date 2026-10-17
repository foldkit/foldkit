import { Effect, Number, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({ count: Schema.Int })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedIncrement: {},
  ClickedResetAfterDelay: {},
  CompletedWaitBeforeReset: {},
})

export const Application = defineApplication({ Model, Message })

export const ApplicationComposition = Application.makeComposition()
export type Message = typeof Message.Type

export const WaitBeforeReset = Application.command('WaitBeforeReset', {
  messages: [Message.CompletedWaitBeforeReset],
  handler: function* () {
    return () =>
      Effect.sleep('1 second').pipe(
        Effect.as(Message.CompletedWaitBeforeReset()),
      )
  },
})

export const EffectsLayer = WaitBeforeReset.layer

export const init = ApplicationComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))

export const update = ApplicationComposition.makeUpdate((model, message) =>
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

export const view = ApplicationComposition.makeView((model, h) => ({
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
}))
