import { Number, Schema } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

export const Model = Schema.Struct({ count: Schema.Number })
export const Message = defineMessageUnion({
  RequestedFetch: { requestId: Schema.Number },
  ClickedIncrement: {},
  SucceededFetch: { requestId: Schema.Number, count: Schema.Number },
  RequestedReport: {},
})
export const OutMessage = defineMessageUnion({ Reported: {} })

export const Fetch = Command.define('StoryConcurrencyFetch', {
  args: { requestId: Schema.Number },
  messages: [Message.SucceededFetch],
})

export const update = (
  model: typeof Model.Type,
  message: typeof Message.Type,
) =>
  Message.match(message, {
    RequestedFetch: ({ requestId }) => ({
      model,
      commands: [Fetch({ requestId })],
    }),
    ClickedIncrement: () => ({
      model: { count: Number.increment(model.count) },
    }),
    SucceededFetch: ({ count }) => ({ model: { count } }),
    RequestedReport: () => ({ model, outMessage: OutMessage.Reported() }),
  })

export const initialModel = Model.make({ count: 0 })
export const concurrentMessages = Story.steps(
  Story.message(Message.RequestedFetch({ requestId: 1 })),
  Story.steps(
    Story.message(Message.ClickedIncrement()),
    Story.message(Message.RequestedFetch({ requestId: 2 })),
  ),
)

export const runConcurrentStory = () =>
  Story.story(
    update,
    Story.given(initialModel),
    concurrentMessages,
    Story.Command.expectExact(Fetch({ requestId: 1 }), Fetch({ requestId: 2 })),
    Story.Command.resolveAll(
      [
        Fetch({ requestId: 1 }),
        Message.SucceededFetch({ requestId: 1, count: 10 }),
      ],
      [
        Fetch({ requestId: 2 }),
        Message.SucceededFetch({ requestId: 2, count: 20 }),
      ],
    ),
    Story.message(Message.RequestedReport()),
    Story.expectOutMessage(OutMessage.Reported()),
  )
