import { Effect, Schema } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  CompletedMeasureWidth: { width: Schema.Number },
})

const MeasureWidth = Mount.define('MeasureWidth', {
  messages: [Message.CompletedMeasureWidth],
})

export class Banner extends Block<Banner>()('Banner', {
  Message,
  Mount: [MeasureWidth],
}) {}

export const BannerLive = Banner.make(
  Effect.fn(function* () {
    return {
      update: {
        CompletedMeasureWidth: model => ({ model }),
      },
      mounts: {
        MeasureWidth: ({ element }) =>
          Effect.sync(() =>
            Message.CompletedMeasureWidth({
              width: element.getBoundingClientRect().width,
            }),
          ),
      },
      view: (_model, h) => h.div([h.OnMount(MeasureWidth())]),
    }
  }),
)

const lookalike = {
  make: (build: () => unknown) => build,
}

export const unrelated = lookalike.make(() => ({
  mounts: { MeasureWidth: () => Effect.void },
}))
