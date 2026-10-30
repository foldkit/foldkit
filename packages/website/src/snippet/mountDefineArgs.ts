import { Array, Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedScrollPanel: {},
})

const ScrollPanel = Mount.define('ScrollPanel', {
  args: { initialScroll: Schema.Number },
  messages: [Message.CompletedScrollPanel],
})

export class Transcript extends Block<Transcript>()('Transcript', {
  Model: Schema.Struct({
    lines: Schema.Array(Schema.String),
    savedScroll: Schema.Number,
  }),
  Message,
  Mount: [ScrollPanel],
}) {}

export const TranscriptLive = Transcript.make(
  Effect.fn(function* () {
    return {
      model: { lines: [], savedScroll: 0 },

      update: {
        CompletedScrollPanel: model => ({ model }),
      },

      mounts: {
        ScrollPanel: ({ element, initialScroll }) =>
          Effect.sync(() => element.scrollTo({ top: initialScroll })).pipe(
            Effect.as(Message.CompletedScrollPanel()),
          ),
      },

      view: (model, h) =>
        h.div(
          [
            h.Class('overflow-y-auto h-64'),
            h.OnMount(ScrollPanel({ initialScroll: model.savedScroll })),
          ],
          Array.map(model.lines, line => h.p([], [line])),
        ),
    }
  }),
)
