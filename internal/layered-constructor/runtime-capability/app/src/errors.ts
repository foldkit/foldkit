import { Context, Effect, Layer, Option, Schema } from 'effect'
import { ManagedResource } from 'foldkit'
import type { ExecutableOf, FactsOf, RuntimeCapability } from 'foldkit/block'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Expect<Value extends true> = Value
const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({ RequestedCheck: {}, CompletedCheck: {} })
export const BuildFailure = Schema.Literals(['HandlerUnavailable'])
export const FailureKey = Symbol('OpaqueCapabilityBuildFailure')

const FailureDefinition = Block.makeDefinition('OpaqueCapabilityBuildFailure', {
  key: FailureKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  effects: { Error: BuildFailure },
})
const Check = FailureDefinition.makeCommand('Check', {
  messages: [Message.CompletedCheck],
  handler: function* () {
    yield* Effect.fail(BuildFailure.make('HandlerUnavailable'))

    return () => Effect.succeed(Message.CompletedCheck())
  },
})
const FailureComposition = FailureDefinition.makeComposition()
export const FailureBlock = FailureDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: FailureComposition.makeInit(() => ({ model: { value: '' } })),
    update: FailureComposition.makeUpdate({
      RequestedCheck: FailureDefinition.makeCommandsStep(() => [Check()]),
      CompletedCheck: FailureDefinition.makeNoopStep(),
    }),
    EffectsLayer: Check.layer,
  }),
)
export type HandlerErrorPreserved = Expect<
  Equal<
    Layer.Error<ExecutableOf<typeof FailureBlock>['EffectsLayer']>,
    typeof BuildFailure.Type
  >
>

export const Unregistered = ManagedResource.tag<string>()(
  'OpaqueCapability/Unregistered',
)
export const MissingKey = Symbol('OpaqueCapabilityMissingResource')

const MissingDefinition = Block.makeDefinition(
  'OpaqueCapabilityMissingResource',
  {
    key: MissingKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
  },
)
const ReadMissing = MissingDefinition.makeCommand('ReadMissing', {
  messages: [Message.CompletedCheck],
  handler: function* () {
    return () =>
      Unregistered.get.pipe(
        Effect.as(Message.CompletedCheck()),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(Message.CompletedCheck()),
        ),
      )
  },
})
const MissingComposition = MissingDefinition.makeComposition()
const missingBody = {
  children: [],
  init: MissingComposition.makeInit(() => ({ model: { value: '' } })),
  update: MissingComposition.makeUpdate({
    RequestedCheck: MissingDefinition.makeCommandsStep(() => [ReadMissing()]),
    CompletedCheck: MissingDefinition.makeNoopStep(),
  }),
  EffectsLayer: ReadMissing.layer,
}
const registered = MissingDefinition.makeManagedResources(entry => ({
  value: entry('ManageValue', Schema.Option(Schema.Null), {
    resource: Unregistered,
    modelToMaybeRequirements: () => Option.some(null),
    onAcquired: () => Message.CompletedCheck(),
    onReleased: () => Message.CompletedCheck(),
    onAcquireError: () => Message.CompletedCheck(),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('Registered'),
        release: () => Effect.void,
      }
    },
  }),
}))
export const RegisteredBlock = MissingDefinition.makeBlock(
  Effect.succeed({
    ...missingBody,
    managedResources: registered,
    EffectsLayer: Layer.merge(ReadMissing.layer, registered.layer),
  }),
)
const incompleteAlternatives =
  Math.random() > 0.5
    ? {
        ...missingBody,
        managedResources: registered,
        EffectsLayer: Layer.merge(ReadMissing.layer, registered.layer),
      }
    : missingBody

if (false) {
  // @ts-expect-error An unregistered resource is not closed by the opaque private Runtime capability.
  MissingDefinition.makeBlock(Effect.succeed(missingBody))
  // @ts-expect-error A resource installed by only one implementation alternative is not guaranteed.
  MissingDefinition.makeBlock(Effect.succeed(incompleteAlternatives))
}

export const ExternalKey = Symbol('OpaqueCapabilityExternalResource')

const ExternalDefinition = Block.makeDefinition(
  'OpaqueCapabilityExternalResource',
  {
    key: ExternalKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
    effects: { resources: [Unregistered] },
  },
)
const ReadExternal = ExternalDefinition.makeCommand('ReadExternal', {
  messages: [Message.CompletedCheck],
  handler: function* () {
    return () =>
      Unregistered.get.pipe(
        Effect.as(Message.CompletedCheck()),
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(Message.CompletedCheck()),
        ),
      )
  },
})
const ExternalComposition = ExternalDefinition.makeComposition()
export const ExternalBlock = ExternalDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ExternalComposition.makeInit(() => ({ model: { value: '' } })),
    update: ExternalComposition.makeUpdate({
      RequestedCheck: ExternalDefinition.makeCommandsStep(() => [
        ReadExternal(),
      ]),
      CompletedCheck: ExternalDefinition.makeNoopStep(),
    }),
    EffectsLayer: ReadExternal.layer,
  }),
)
export type ExternalResourceRemainsRequired = Expect<
  Equal<
    FactsOf<typeof ExternalBlock>['programRequirements'],
    ManagedResource.ServiceOf<typeof Unregistered>
  >
>
export type ExternalResourceNotPromisedInstalled = Expect<
  Equal<
    FactsOf<typeof ExternalBlock>['runtimeServices'],
    RuntimeCapability<typeof ExternalBlock.owner>
  >
>

const EagerRead = Context.Service<'OpaqueCapability/EagerRead', string>(
  'OpaqueCapability/EagerRead',
)
export const EagerReadBlock = MissingDefinition.makeBlock(
  Effect.succeed({
    ...missingBody,
    managedResources: registered,
    EffectsLayer: Layer.mergeAll(
      ReadMissing.layer,
      registered.layer,
      Layer.effect(
        EagerRead,
        Unregistered.get.pipe(
          Effect.catchTag('ResourceNotAvailable', () =>
            Effect.succeed('Unavailable'),
          ),
        ),
      ),
    ),
  }),
)
