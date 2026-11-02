import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const SharedNamespace = Block.makeNamespace('CanonicalSharedNamespace')
const Message = defineMessageUnion({ CompletedTrackView: {} })
export const TrackView = SharedNamespace.makeMount('TrackView', {
  messages: [Message.CompletedTrackView],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() => element.setAttribute('data-mounted', 'true')).pipe(
        Effect.as(Message.CompletedTrackView()),
      )
  },
})
const Model = Schema.Struct({ label: Schema.String })
export const SharedNativeDefinition = SharedNamespace.makeDefinition({
  Model,
  Message,
})
export const SharedKey = Symbol('CanonicalSharedNamespace')
export const SharedDefinition = SharedNamespace.makeDefinition({
  key: SharedKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const SharedComposition = SharedDefinition.makeComposition({
  mounts: [TrackView],
})
export const SharedBlock = SharedDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: SharedComposition.makeInit(() => ({ model: { label: 'Shared' } })),
    update: SharedComposition.makeUpdate({
      CompletedTrackView: SharedDefinition.makeNoopStep(),
    }),
    view: SharedComposition.makeView((model, h) =>
      h.div([h.OnMount(TrackView())], [model.label]),
    ),
    EffectsLayer: TrackView.layer,
  }),
)
