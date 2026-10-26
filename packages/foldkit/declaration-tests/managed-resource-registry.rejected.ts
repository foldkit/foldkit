import { Effect, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as ManagedResource from 'foldkit/managedResource'
import { defineMessageUnion } from 'foldkit/message'

const Model = Schema.Struct({ active: Schema.Boolean })
const Message = Schema.Struct({ value: Schema.String })
const message = (value: string): typeof Message.Type => Message.make({ value })
const Resource = ManagedResource.tag<string>()('EmittedRejectedResource')
const Definition = Block.makeDefinition('EmittedRejected', { Model, Message })

const widenRegistry = <Entry>(
  entry: Entry,
): Readonly<Record<string, Entry>> => ({ entry })

const retainEither = <Left, Right>(left: Left, _right: Right): Left | Right =>
  left

const hosted = Definition.makeManagedResources(entry => ({
  hosted: entry('Hosted', Schema.Option(Schema.Null), {
    resource: Resource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
  }),
}))

// @ts-expect-error A registry with a hosted entry has no aggregate Layer.
hosted.layer
// @ts-expect-error ManagedResource registries are readonly.
hosted.hosted = hosted.hosted
// @ts-expect-error ManagedResource registry entries cannot be deleted.
delete hosted.hosted

Definition.makeManagedResources(entry => ({
  // @ts-expect-error The layer key is reserved for the aggregate handler Layer.
  layer: entry('Reserved', Schema.Option(Schema.Null), {
    resource: Resource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('value'),
        release: () => Effect.void,
      }
    },
  }),
}))

Definition.makeManagedResources(entry =>
  // @ts-expect-error An open string-keyed registry cannot expose a closed aggregate Layer.
  widenRegistry(
    entry('Open', Schema.Option(Schema.Null), {
      resource: Resource,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: message,
      onReleased: () => message('released'),
      onAcquireError: () => message('failed'),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('value'),
          release: () => Effect.void,
        }
      },
    }),
  ),
)

const conflicting = Definition.makeManagedResources(entry => ({
  selected: retainEither(
    entry('FirstContract', Schema.Option(Schema.Null), {
      resource: Resource,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: message,
      onReleased: () => message('released'),
      onAcquireError: () => message('failed'),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('first'),
          release: () => Effect.void,
        }
      },
    }),
    entry('SecondContract', Schema.Option(Schema.Null), {
      resource: Resource,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: message,
      onReleased: () => message('released'),
      onAcquireError: () => message('failed'),
      handler: function* () {
        return yield* Effect.fail('constructor failure')
      },
    }),
  ),
}))

// @ts-expect-error Entries with different Layer channels have no aggregate Layer.
conflicting.layer

const ForeignModel = Schema.Struct({ foreign: Schema.String })
const ForeignMessage = defineMessageUnion({
  ChangedForeign: { value: Schema.String },
})
const ForeignResource = ManagedResource.tag<string>()(
  'RegistryCompatibilityForeign',
)
const ForeignDefinition = Block.makeDefinition('RegistryCompatibilityForeign', {
  Model: ForeignModel,
  Message: ForeignMessage,
})
const foreignResources = ForeignDefinition.makeManagedResources(entry => ({
  foreign: entry('ManageForeign', Schema.Option(Schema.Null), {
    resource: ForeignResource,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: value => ForeignMessage.ChangedForeign({ value }),
    onReleased: () => ForeignMessage.ChangedForeign({ value: 'released' }),
    onAcquireError: () => ForeignMessage.ChangedForeign({ value: 'failed' }),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('foreign'),
        release: () => Effect.void,
      }
    },
  }),
}))

const ParentModel = Schema.Struct({ count: Schema.Number })
const ParentMessage = defineMessageUnion({ Incremented: {} })
const ParentDefinition = Block.makeDefinition('RegistryCompatibilityParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ParentComposition = ParentDefinition.makeComposition()
type ParentModel = typeof ParentModel.Type
type ParentMessage = typeof ParentMessage.Type
const parentUpdate = ParentComposition.makeUpdate({
  Incremented: model => ({ model }),
})

const WrongMessageDefinition = Block.makeDefinition(
  'RegistryCompatibilityWrongMessage',
  { Model: ParentModel, Message: ForeignMessage },
)
const wrongMessageResources = WrongMessageDefinition.makeManagedResources(
  entry => ({
    foreign: entry('ManageWrongMessage', Schema.Option(Schema.Null), {
      resource: ForeignResource,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: value => ForeignMessage.ChangedForeign({ value }),
      onReleased: () => ForeignMessage.ChangedForeign({ value: 'released' }),
      onAcquireError: () => ForeignMessage.ChangedForeign({ value: 'failed' }),
      handler: function* () {
        return {
          acquire: () => Effect.succeed('foreign'),
          release: () => Effect.void,
        }
      },
    }),
  }),
)

const wrongImplementation = {
  init: () => ({ model: ParentModel.make({ count: 0 }) }),
  update: parentUpdate,
  managedResources: foreignResources,
  EffectsLayer: foreignResources.layer,
}
// @ts-expect-error A registry retains its owning Model.
ParentComposition.prepareBlock(wrongImplementation)

const wrongMessageImplementation = {
  init: () => ({ model: ParentModel.make({ count: 0 }) }),
  update: parentUpdate,
  managedResources: wrongMessageResources,
  EffectsLayer: wrongMessageResources.layer,
}
// @ts-expect-error A registry retains its owning Message.
ParentComposition.prepareBlock(wrongMessageImplementation)

const wrongRawImplementation = {
  init: () => ({ model: ParentModel.make({ count: 0 }) }),
  update: parentUpdate,
  managedResources: { foreign: foreignResources.foreign },
  EffectsLayer: foreignResources.layer,
}
// @ts-expect-error Raw entry records retain their owning Model and Message.
ParentComposition.prepareBlock(wrongRawImplementation)
