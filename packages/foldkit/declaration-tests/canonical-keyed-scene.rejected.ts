import { Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import * as Scene from 'foldkit/scene'

import {
  CanonicalChildBlock,
  CanonicalChildMessage,
  CanonicalChildModel,
  CanonicalChildrenBinding,
  CanonicalParentBlock,
  canonicalManagedResources,
  canonicalParentLayer,
  canonicalSubscriptions,
} from './optional-wrapped-keyed.accepted.js'

const canonicalSelectedTicks = Scene.Subscription.at(
  CanonicalChildrenBinding,
  'first',
  canonicalSubscriptions.ticks,
)
Scene.Subscription.emit(
  canonicalSelectedTicks,
  // @ts-expect-error The canonical selected Subscription accepts only its declared Message.
  CanonicalChildMessage.AcquiredSession({ value: 'session' }),
)
Scene.Subscription.at(
  CanonicalChildrenBinding,
  // @ts-expect-error The canonical map Binding key is a string.
  1,
  canonicalSubscriptions.ticks,
)

const ForeignSourceModel = Schema.Struct({ label: Schema.String })
const ForeignSourceKey = Symbol('DeclarationOptionalWrappedKeyedForeignSource')
const ForeignSourceBlock = Block.make(
  'DeclarationOptionalWrappedKeyedForeignSource',
  {
    key: ForeignSourceKey,
    Model: ForeignSourceModel,
    Message: CanonicalChildMessage,
    InitArgs: Schema.Tuple([]),
  },
)
const foreignSubscriptions = ForeignSourceBlock.makeSubscriptions(entry => ({
  ticks: entry('ForeignTicks', {
    messages: [CanonicalChildMessage.ObservedTick],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))
Scene.Subscription.at(
  CanonicalChildrenBinding,
  'first',
  // @ts-expect-error The canonical selected Subscription source must match the bound child Model and Message.
  foreignSubscriptions.ticks,
)

const canonicalSelectedSession = Scene.ManagedResource.at(
  CanonicalChildrenBinding,
  'first',
  canonicalManagedResources.session,
)
Scene.ManagedResource.acquire(
  canonicalSelectedSession,
  // @ts-expect-error The canonical selected ManagedResource preserves its acquired value type.
  1,
)

const ForeignCanonicalParentModel = Schema.Struct({
  children: Schema.Record(Schema.String, CanonicalChildModel),
})
const ForeignCanonicalParentKey = Symbol(
  'DeclarationOptionalWrappedKeyedForeignCanonicalParent',
)
const ForeignCanonicalParentBlock = Block.make(
  'DeclarationOptionalWrappedKeyedForeignCanonicalParent',
  {
    key: ForeignCanonicalParentKey,
    Model: ForeignCanonicalParentModel,
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
const ForeignCanonicalChildrenBinding =
  ForeignCanonicalParentBlock.makeRecordBinding(CanonicalChildBlock, {
    field: 'children',
  })
const foreignCanonicalTicks = Scene.Subscription.at(
  ForeignCanonicalChildrenBinding,
  'first',
  canonicalSubscriptions.ticks,
)
Scene.scene(
  // @ts-expect-error A selected Subscription Binding must belong to the Scene's parent Block even when both parent Models have the same shape.
  { block: CanonicalParentBlock, layer: canonicalParentLayer },
  Scene.given({
    children: { first: CanonicalChildModel.make({ count: 0 }) },
  }),
  Scene.Subscription.emit(
    foreignCanonicalTicks,
    CanonicalChildMessage.ObservedTick(),
  ),
)
