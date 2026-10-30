import { Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedTrackView: {},
  CompletedRevealResults: {},
})
type Message = typeof Message.Type

const TrackView = Mount.define('TrackView', {
  messages: [Message.CompletedTrackView],
})

const RevealResults = Mount.define('RevealResults', {
  messages: [Message.CompletedRevealResults],
})

class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({ query: Schema.String }),
  Message,
  Mount: [TrackView, RevealResults],
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    return {
      model: { query: '' },
      update: {
        CompletedTrackView: model => ({ model }),
        CompletedRevealResults: model => ({ model }),
      },
      mounts: {
        // ❌ Bad
        // The handler never uses its element, so Mount is the wrong primitive.
        TrackView: () =>
          Effect.log('search viewed').pipe(
            Effect.as(Message.CompletedTrackView()),
          ),

        // ✅ Good
        // The handler does DOM work on the element it was mounted on.
        RevealResults: ({ element }) =>
          Effect.sync(() => element.scrollIntoView()).pipe(
            Effect.as(Message.CompletedRevealResults()),
          ),
      },
      view: (model, h) =>
        h.div(
          [h.OnMount(TrackView())],
          [h.ul([h.OnMount(RevealResults())], [model.query])],
        ),
    }
  }),
)
