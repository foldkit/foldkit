import { Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedTrackVisit: {},
  CompletedMeasureWidth: { width: Schema.Number },
})

const TrackVisit = Mount.define('TrackVisit', {
  messages: [Message.CompletedTrackVisit],
})

const MeasureWidth = Mount.define('MeasureWidth', {
  messages: [Message.CompletedMeasureWidth],
})

export class Banner extends Block<Banner>()('Banner', {
  Message,
  Mount: [TrackVisit, MeasureWidth],
}) {}

export const BannerLive = Banner.make(
  Effect.fn(function* () {
    return {
      update: {
        CompletedTrackVisit: model => ({ model }),
        CompletedMeasureWidth: model => ({ model }),
      },
      mounts: {
        TrackVisit: () => Effect.succeed(Message.CompletedTrackVisit()),
        MeasureWidth: ({ element: _element }) =>
          Effect.succeed(Message.CompletedMeasureWidth({ width: 0 })),
      },
      view: (_model, h) =>
        h.div([h.OnMount(TrackVisit()), h.OnMount(MeasureWidth())]),
    }
  }),
)
