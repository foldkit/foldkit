import { Context, Data, Effect, Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as ManagedResource from 'foldkit/managedResource'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

const Model = Schema.Struct({ active: Schema.Boolean })
const Message = Schema.Struct({ value: Schema.String })
const message = (value: string): typeof Message.Type => Message.make({ value })

class Dependency extends Context.Service<
  Dependency,
  Readonly<{ id: string }>
>()('ManagedResourceRegistryEmittedDependency') {}

class BuildFailure extends Data.TaggedError('BuildFailure')<{}> {}

const TextResource = ManagedResource.tag<string>()(
  'ManagedResourceRegistryEmittedText',
)
const NumberResource = ManagedResource.tag<number>()(
  'ManagedResourceRegistryEmittedNumber',
)
const Definition = Block.makeDefinition('ManagedResourceRegistryEmitted', {
  Model,
  Message,
})

export const attached = Definition.makeManagedResources(entry => ({
  text: entry('ManageText', Schema.Option(Schema.Null), {
    resource: TextResource,
    modelToMaybeRequirements: model =>
      model.active ? Option.some(null) : Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      const { id } = yield* Dependency
      return {
        acquire: () => Effect.succeed(id),
        release: () => Effect.void,
      }
    },
  }),
  number: entry('ManageNumber', Schema.Option(Schema.Null), {
    resource: NumberResource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: value => message(globalThis.String(value)),
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      return yield* Effect.fail(new BuildFailure())
    },
  }),
}))

export const empty = Definition.makeManagedResources(() => ({}))
export const mixed = Definition.makeManagedResources(entry => ({
  attached: entry('Attached', Schema.Option(Schema.Null), {
    resource: TextResource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('attached'),
        release: () => Effect.void,
      }
    },
  }),
  hosted: entry('Hosted', Schema.Option(Schema.Null), {
    resource: TextResource,
    modelToMaybeRequirements: () => Option.none(),
    onAcquired: message,
    onReleased: () => message('released'),
    onAcquireError: () => message('failed'),
  }),
}))

export const HostedLayer = mixed.hosted.toLayer(
  Effect.succeed({
    acquire: () => Effect.succeed('hosted'),
    release: () => Effect.void,
  }),
)
export const aggregated = ManagedResource.aggregate(attached)
export const lifted = ManagedResource.lift(attached)<
  Readonly<{ child: typeof Model.Type }>,
  typeof Message.Type
>({
  read: model => Option.some(model.child),
  toParentMessage: parentMessage => parentMessage,
})

export type AttachedHandlers = Assert<
  Equal<
    Layer.Success<typeof attached.layer>,
    | ManagedResource.HandlerOf<typeof attached.text>
    | ManagedResource.HandlerOf<typeof attached.number>
  >
>
export type AttachedErrors = Assert<
  Equal<Layer.Error<typeof attached.layer>, BuildFailure>
>
export type AttachedServices = Assert<
  Equal<Layer.Services<typeof attached.layer>, Dependency>
>
export type EmptyLayer = Assert<Equal<typeof empty.layer, Layer.Layer<never>>>
export type MixedHasNoLayer = Assert<
  Equal<'layer' extends keyof typeof mixed ? true : false, false>
>
