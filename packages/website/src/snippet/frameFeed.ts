import { Array, Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Message = defineMessageUnion({
  ClickedReconnect: {},
  ReceivedFrame: { sessionId: Schema.Number, frame: Schema.String },
})

export class FrameFeed extends Block<FrameFeed>()('FrameFeed', {
  Model: Schema.Struct({
    sessionId: Schema.Number,
    frames: Schema.Array(Schema.String),
  }),
  Message,
}) {}

export const FrameFeedLive = FrameFeed.make(
  Effect.fn(function* () {
    return {
      model: { sessionId: 1, frames: [] },

      update: {
        ClickedReconnect: model => ({
          model: modifyFields(model, {
            sessionId: Number.increment,
            frames: () => [],
          }),
        }),
        ReceivedFrame: (model, { sessionId, frame }) => {
          if (sessionId !== model.sessionId) {
            return { model }
          }

          return {
            model: modifyFields(model, { frames: Array.append(frame) }),
          }
        },
      },

      view: (model, h) => h.p([], [`${model.frames.length} frames`]),
    }
  }),
)
