import { Context, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import { SharedNamespace, TrackView } from './sharedNamespace.js'

const Model = Schema.Struct({ label: Schema.String })
const Message = defineMessageUnion({ CompletedTrackView: {} })
export const SharedFamilyKey = Symbol('CanonicalSharedFamily')
export const SharedFamilyDefinition = Block.makeFamilyDefinition(
  SharedNamespace,
  {
    key: SharedFamilyKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
const Composition = SharedFamilyDefinition.makeComposition({
  mounts: [TrackView],
})
const recipe = SharedFamilyDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(() => ({ model: { label: 'Family' } })),
    update: Composition.makeUpdate({
      CompletedTrackView: SharedFamilyDefinition.makeNoopStep(),
    }),
    view: Composition.makeView((model, h) =>
      h.div([h.OnMount(TrackView())], [model.label]),
    ),
    EffectsLayer: TrackView.layer,
  }),
)
export class FamilyProvider extends Context.Service<
  FamilyProvider,
  Block.FamilyLifetime
>()('CanonicalSharedFamilyProvider') {}
export const FamilyLayer = Layer.effect(FamilyProvider)(Block.familyLifetime)
export const FamilyBlock = Block.makeFamilyContract(
  SharedFamilyDefinition,
  FamilyProvider,
  () => recipe,
)
export const FamilyCompletedTrackView = Message.CompletedTrackView

const InvalidNamespaceKey = Symbol('InvalidFamilyNamespace')
const forgedNamespace = {}
const rejectForgedNamespace = () => {
  // @ts-expect-error A same-shaped object cannot stand in for the original namespace.
  Block.makeFamilyDefinition(forgedNamespace, {
    key: InvalidNamespaceKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
  })
}
void rejectForgedNamespace
