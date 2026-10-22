import {
  Context,
  Effect,
  type Layer,
  Schema,
  type Scope,
  type Stream,
} from 'effect'
import { expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import type * as Mount from '../mount/index.js'
import type * as Subscription from '../subscription/public.js'
import * as Update from '../update/index.js'
import type { BindingBlockEvidence } from './binding.js'
import type { Owner } from './owner.js'
import { type OwnedName, makeOwnedName } from './ownerName.js'
import type {
  HandlerOfHostDefinition,
  ManagedResourceLifecycleRequirements,
  ManagedResourceRuntimeServices,
  MountRequirements,
  OperationRequirementsOfBlock,
  ProducerRequirements,
  RequirementsOfBlock,
  SubscriptionRequirements,
  ValidateComposition,
  ValidateImplementationChannels,
} from './requirements.js'

const Message = defineMessageUnion({
  CompletedWork: { value: Schema.String },
  ReportedValue: { value: Schema.String },
})
type Message = typeof Message.Type
type CompletedWork = typeof Message.CompletedWork.Type

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type

const OutMessage = defineMessageUnion({
  ReportedValue: { value: Schema.String },
})
type OutMessage = typeof OutMessage.Type
type EmptyRecord = Readonly<Record<never, never>>

class RoomsClient extends Context.Service<
  RoomsClient,
  Readonly<{ roomName: string }>
>()('BlockRequirementsTestRoomsClient') {}

const Initialize = Command.define(makeOwnedName('Requirements', 'Initialize'), {
  messages: [Message.CompletedWork],
})

const WaitForBoot = Command.define(
  makeOwnedName('Requirements', 'WaitForBoot'),
  {
    messages: [Message.CompletedWork],
  },
)

const Refresh = Command.define(makeOwnedName('Requirements', 'Refresh'), {
  messages: [Message.CompletedWork],
})

const ReadHostState = Command.define(
  makeOwnedName('Requirements', 'ReadHostState'),
  { messages: [Message.CompletedWork] },
)

const LoadRoom = Command.define(makeOwnedName('Requirements', 'LoadRoom'), {
  messages: [Message.CompletedWork],
  handler: function* () {
    yield* RoomsClient
    return () => ReadHostState().effect
  },
})

const InitializeWithValue = Command.define(
  makeOwnedName('Requirements', 'Initialize'),
  {
    args: { value: Schema.String },
    messages: [Message.CompletedWork],
  },
)

const model = Model.make({ value: '' })

const reportedValue = (value: string): OutMessage =>
  OutMessage.ReportedValue({ value })

const init = () => ({ model, commands: [Initialize()] })

const update = Update.define((_model: Model, _message: Message) => ({
  model,
  commands: [LoadRoom()],
}))

const boot = Update.defineStep((_model: Model) => ({
  model,
  commands: [WaitForBoot()],
}))

const refresh = Update.defineStep((_model: Model) => ({
  model,
  commands: [Refresh()],
  outMessage: reportedValue('ready'),
}))

type CompleteBlock = Readonly<{
  init: typeof init
  update: typeof update
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: EmptyRecord
  mounts: readonly []
  bindings: readonly []
  EffectsLayer: typeof LoadRoom.layer
  hostHandlers: readonly [typeof Initialize, typeof ReadHostState]
}>

it('collects block requirements separately from public Step producers', () => {
  expectTypeOf<ProducerRequirements<typeof init>>().toEqualTypeOf<
    Command.HandlerOf<typeof Initialize>
  >()
  expectTypeOf<ProducerRequirements<typeof boot>>().toEqualTypeOf<
    Command.HandlerOf<typeof WaitForBoot>
  >()
  expectTypeOf<ProducerRequirements<typeof refresh>>().toEqualTypeOf<
    Command.HandlerOf<typeof Refresh>
  >()
  type Requirements = RequirementsOfBlock<CompleteBlock>
  type Expected =
    | RoomsClient
    | Command.HandlerOf<typeof Initialize>
    | Command.HandlerOf<typeof ReadHostState>

  expectTypeOf<Exclude<Requirements, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Requirements>>().toEqualTypeOf<never>()

  type OperationRequirements = OperationRequirementsOfBlock<CompleteBlock>
  type ExpectedOperationRequirements =
    | Command.HandlerOf<typeof Initialize>
    | Command.HandlerOf<typeof LoadRoom>

  expectTypeOf<
    Exclude<OperationRequirements, ExpectedOperationRequirements>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    Exclude<ExpectedOperationRequirements, OperationRequirements>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    ValidateComposition<CompleteBlock, CompleteBlock>
  >().toEqualTypeOf<unknown>()
})

it('preserves refined OutMessage producer requirements', () => {
  expectTypeOf<ReturnType<typeof refresh>['outMessage']>().toEqualTypeOf<
    OutMessage | undefined
  >()
  expectTypeOf<ProducerRequirements<typeof refresh>>().toEqualTypeOf<
    Command.HandlerOf<typeof Refresh>
  >()
})

type MissingHostBlock = Omit<CompleteBlock, 'hostHandlers'> &
  Readonly<{ hostHandlers: readonly [] }>

it('reports every handler without a local provider as a missing host contract', () => {
  type Missing = ValidateComposition<
    CompleteBlock,
    MissingHostBlock
  >['Block handler requirements must be provided locally or listed in hostHandlers']
  type Expected =
    | Command.HandlerOf<typeof Initialize>
    | Command.HandlerOf<typeof ReadHostState>

  expectTypeOf<Exclude<Missing, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Missing>>().toEqualTypeOf<never>()
})

type HostDefinition<Handler> = Readonly<{
  toLayer: (...args: ReadonlyArray<any>) => unknown
}> &
  (() => Readonly<{
    effect: Effect.Effect<CompletedWork, never, Handler>
  }>)

type ChildHandler = Command.Handler<
  OwnedName<'Requirements/Child', 'Work'>,
  void,
  CompletedWork
>
type ChildWork = HostDefinition<ChildHandler>

type ChildBlock = Readonly<{
  init: () => Update.Return<Model, Message, ChildHandler>
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: EmptyRecord
  mounts: readonly []
  bindings: readonly []
  EffectsLayer: Layer.Layer<never, never, never>
  hostHandlers: readonly [ChildWork]
}>

type ChildBinding = BindingBlockEvidence<ChildBlock> &
  Readonly<{
    fold: (model: Model) => Update.Return<Model, Message>
    operations: EmptyRecord
    subscriptions: EmptyRecord
    managedResources: EmptyRecord
    mounts: readonly []
  }>

type ParentBase = Readonly<{
  init: () => Update.Return<Model, Message>
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: EmptyRecord
  mounts: readonly []
  bindings: readonly [ChildBinding]
}>

type ParentSatisfiesChild = ParentBase &
  Readonly<{
    EffectsLayer: Layer.Layer<ChildHandler, never, never>
    hostHandlers: readonly []
  }>

type ParentForwardsChild = ParentBase &
  Readonly<{
    EffectsLayer: Layer.Layer<never, never, never>
    hostHandlers: readonly [ChildWork]
  }>

it('lets a parent satisfy or forward a child host contract', () => {
  expectTypeOf<
    RequirementsOfBlock<ParentSatisfiesChild>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    ValidateComposition<ParentSatisfiesChild, ParentSatisfiesChild>
  >().toEqualTypeOf<unknown>()

  expectTypeOf<
    RequirementsOfBlock<ParentForwardsChild>
  >().toEqualTypeOf<ChildHandler>()
  expectTypeOf<
    ValidateComposition<ParentForwardsChild, ParentForwardsChild>
  >().toEqualTypeOf<unknown>()
})

type SubscriptionHandler = Subscription.Handler<
  OwnedName<'Requirements', 'RoomChanges'>,
  Readonly<{ roomId: string }>,
  Message
>

type RoomChanges = Readonly<{
  toLayer: (...args: ReadonlyArray<any>) => unknown
  dependenciesToStream: (
    dependencies: Readonly<{ roomId: string }>,
  ) => Stream.Stream<Message, never, SubscriptionHandler>
}>

type MountHandler = Mount.Handler<
  OwnedName<'Requirements', 'FocusRoom'>,
  Readonly<{ element: Element }>,
  Message
>

type FocusRoom = Readonly<{
  toLayer: (...args: ReadonlyArray<any>) => unknown
}> &
  (() => Mount.MountAction<Message, never, MountHandler>)

const RoomConnection = ManagedResource.tag<string>()(
  'Requirements/RoomConnection',
)
type RoomConnectionService = ManagedResource.ServiceOf<typeof RoomConnection>
type ResourceHandler = ManagedResource.Handler<
  OwnedName<'Requirements', 'ManageRoomConnection'>,
  Readonly<{ roomId: string }>,
  string
>

type ManageRoomConnection = Readonly<{
  toLayer: (...args: ReadonlyArray<any>) => unknown
  resource: typeof RoomConnection
  acquire: (
    params: Readonly<{ roomId: string }>,
  ) => Effect.Effect<string, unknown, Scope.Scope | ResourceHandler>
  release: (
    value: string,
  ) => Effect.Effect<void, unknown, Scope.Scope | ResourceHandler>
}>

type Registrations = Readonly<{
  subscriptions: Readonly<{ roomChanges: RoomChanges }>
  managedResources: Readonly<{ roomConnection: ManageRoomConnection }>
  mounts: readonly [FocusRoom]
}>

it('extracts exact lifecycle registrations and runtime services', () => {
  expectTypeOf<
    SubscriptionRequirements<Registrations['subscriptions']>
  >().toEqualTypeOf<SubscriptionHandler>()
  expectTypeOf<
    ManagedResourceLifecycleRequirements<Registrations['managedResources']>
  >().toEqualTypeOf<ResourceHandler>()
  expectTypeOf<
    ManagedResourceRuntimeServices<Registrations['managedResources']>
  >().toEqualTypeOf<RoomConnectionService>()
  expectTypeOf<
    MountRequirements<Registrations['mounts']>
  >().toEqualTypeOf<MountHandler>()
  expectTypeOf<
    HandlerOfHostDefinition<RoomChanges>
  >().toEqualTypeOf<SubscriptionHandler>()
  expectTypeOf<
    HandlerOfHostDefinition<ManageRoomConnection>
  >().toEqualTypeOf<ResourceHandler>()
  expectTypeOf<
    HandlerOfHostDefinition<FocusRoom>
  >().toEqualTypeOf<MountHandler>()
})

type ResourceOperation = () => Update.Return<
  Model,
  Message,
  RoomConnectionService
>

type RuntimeHandleBlock = Readonly<{
  init: ResourceOperation
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: Registrations['managedResources']
  mounts: readonly []
  bindings: readonly []
  EffectsLayer: Layer.Layer<never, never, RoomConnectionService>
  hostHandlers: readonly [ManageRoomConnection]
}>

it('satisfies operation and Layer construction handles at runtime', () => {
  type Requirements = RequirementsOfBlock<RuntimeHandleBlock>
  type Expected = ResourceHandler

  expectTypeOf<Exclude<Requirements, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Requirements>>().toEqualTypeOf<never>()
})

type RuntimeHandleBinding = BindingBlockEvidence<RuntimeHandleBlock> &
  Readonly<{
    fold: (model: Model) => Update.Return<Model, Message>
    operations: EmptyRecord
    subscriptions: EmptyRecord
    managedResources: Registrations['managedResources']
    mounts: readonly []
  }>

type ParentWithLiftedRuntimeHandle = Readonly<{
  init: () => Update.Return<Model, Message>
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: Registrations['managedResources']
  mounts: readonly []
  bindings: readonly [RuntimeHandleBinding]
  EffectsLayer: Layer.Layer<never, never, never>
  hostHandlers: readonly [ManageRoomConnection]
}>

it('satisfies an inherited child Layer construction handle at runtime', () => {
  type Requirements = RequirementsOfBlock<ParentWithLiftedRuntimeHandle>
  type Expected = ResourceHandler

  expectTypeOf<Exclude<Requirements, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Requirements>>().toEqualTypeOf<never>()
})

type NearbyOrdinaryServiceBlock = Readonly<{
  init: () => Update.Return<Model, Message, RoomsClient>
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: EmptyRecord
  mounts: readonly []
  bindings: readonly []
  EffectsLayer: Layer.Layer<RoomsClient, never, never>
  hostHandlers: readonly []
}>

it('separates unchanged operation services from Layer completion residuals', () => {
  expectTypeOf<
    RequirementsOfBlock<NearbyOrdinaryServiceBlock>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    OperationRequirementsOfBlock<NearbyOrdinaryServiceBlock>
  >().toEqualTypeOf<RoomsClient>()
})

type ErasedProducerBlock = Omit<CompleteBlock, 'update'> &
  Readonly<{
    update: (
      model: Model,
      message: Message,
    ) => Update.Return<Model, Message, any>
  }>

it('rejects erased producer requirements', () => {
  expectTypeOf<
    ValidateComposition<
      CompleteBlock,
      ErasedProducerBlock
    >['Block requirement sources must preserve exact service types']
  >().toEqualTypeOf<'init, update, or exposed operations'>()
})

const ImportedWork = Command.define('ImportedWork', {
  messages: [Message.CompletedWork],
})

const ImportedWorkLayer = ImportedWork.toLayer(
  Effect.succeed(() =>
    Effect.succeed(Message.CompletedWork({ value: 'imported' })),
  ),
)

const importedInit = () => ({ model, commands: [ImportedWork()] })

type ImportedBase = Readonly<{
  init: typeof importedInit
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  operations: EmptyRecord
  subscriptions: EmptyRecord
  managedResources: EmptyRecord
  mounts: readonly []
  bindings: readonly []
}>

type LocallyProvidedImportedCommand = ImportedBase &
  Readonly<{
    EffectsLayer: typeof ImportedWorkLayer
    hostHandlers: readonly []
  }>

type HostProvidedImportedCommand = ImportedBase &
  Readonly<{
    EffectsLayer: Layer.Layer<never, never, never>
    hostHandlers: readonly [typeof ImportedWork]
  }>

it('accepts an exact unbranded imported Command from a local provider', () => {
  expectTypeOf<
    OperationRequirementsOfBlock<LocallyProvidedImportedCommand>
  >().toEqualTypeOf<Command.HandlerOf<typeof ImportedWork>>()
  expectTypeOf<
    RequirementsOfBlock<LocallyProvidedImportedCommand>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    ValidateComposition<
      LocallyProvidedImportedCommand,
      LocallyProvidedImportedCommand
    >
  >().toEqualTypeOf<unknown>()
})

it('accepts an exact unbranded imported Command as a host contract', () => {
  expectTypeOf<
    RequirementsOfBlock<HostProvidedImportedCommand>
  >().toEqualTypeOf<Command.HandlerOf<typeof ImportedWork>>()
  expectTypeOf<
    ValidateComposition<
      HostProvidedImportedCommand,
      HostProvidedImportedCommand
    >
  >().toEqualTypeOf<unknown>()
})

const refreshFactory = (value: string) =>
  Update.defineStep((stepModel: Model) => ({
    model: stepModel,
    commands: [Refresh()],
    outMessage: reportedValue(value),
  }))

it('retains Command requirements through nested Step factories', () => {
  expectTypeOf<ProducerRequirements<typeof refreshFactory>>().toEqualTypeOf<
    Command.HandlerOf<typeof Refresh>
  >()

  type DeferredAgain = () => typeof refreshFactory
  expectTypeOf<ProducerRequirements<DeferredAgain>>().toEqualTypeOf<
    Command.HandlerOf<typeof Refresh>
  >()
})

type OperationFactoryConnection = BindingBlockEvidence<
  Readonly<{
    operations: Readonly<{
      refresh: (model: Model, value: string) => Readonly<{ model: Model }>
    }>
  }>
> &
  Readonly<{
    placement: 'Child'
    fold: (
      model: Model,
      message: Message,
    ) => Update.Return<Model, Message, Command.HandlerOf<typeof Refresh>>
    refresh: typeof refreshFactory
  }>

type ParentWithPolicyStep = Readonly<{
  init: () => Update.Return<Model, Message>
  update: (model: Model, message: Message) => Update.Return<Model, Message>
  bindings: readonly [OperationFactoryConnection]
  EffectsLayer: Layer.Layer<never, never, never>
  hostHandlers: readonly []
}>

it('reports policy Commands retained by an exposed operation binding', () => {
  expectTypeOf<RequirementsOfBlock<ParentWithPolicyStep>>().toEqualTypeOf<
    Command.HandlerOf<typeof Refresh>
  >()

  expectTypeOf<
    ValidateComposition<
      ParentWithPolicyStep,
      ParentWithPolicyStep
    >['Block handler requirements must be provided locally or listed in hostHandlers']
  >().toEqualTypeOf<Command.HandlerOf<typeof Refresh>>()
})

type LocalOwner = Owner<'Requirements', true>
type DeclaredOwner = Owner<'Requirements', false>
type EmptyLayer = Layer.Layer<never, never, never>
type PlainInit = () => Readonly<{ model: Model }>
type PlainUpdate = (
  model: Model,
  message: Message,
) => Update.Return<Model, Message>

type EmptyCompositionChannels<
  OwnerValue,
  Init,
  UpdateFunction,
  EffectsLayer,
  HostHandlers,
> = ValidateImplementationChannels<
  OwnerValue,
  readonly [],
  readonly [],
  Init,
  UpdateFunction,
  EmptyRecord,
  EmptyRecord,
  EffectsLayer,
  HostHandlers
>

it('accepts implementation channels whose handlers are provided locally or declared for the host', () => {
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      typeof init,
      typeof update,
      typeof LoadRoom.layer,
      readonly [typeof Initialize, typeof ReadHostState]
    >
  >().toEqualTypeOf<unknown>()
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      PlainInit | typeof init,
      PlainUpdate,
      EmptyLayer,
      readonly [typeof Initialize]
    >
  >().toEqualTypeOf<unknown>()
})

it('reports every handler the implementation channels leave for the host', () => {
  type Missing = EmptyCompositionChannels<
    LocalOwner,
    typeof init,
    typeof update,
    typeof LoadRoom.layer,
    readonly []
  >['Block handler requirements must be provided locally or listed in hostHandlers']
  type Expected =
    | Command.HandlerOf<typeof Initialize>
    | Command.HandlerOf<typeof ReadHostState>

  expectTypeOf<Exclude<Missing, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Missing>>().toEqualTypeOf<never>()
})

it('reports a declared host handler that no implementation channel requires', () => {
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      readonly [typeof Initialize]
    >['Block hostHandlers must match residual handler requirements']
  >().toEqualTypeOf<Command.HandlerOf<typeof Initialize>>()
})

it('reports conflicting handler contracts across the implementation channels', () => {
  type ConflictingUpdate = (
    model: Model,
    message: Message,
  ) => Update.Return<
    Model,
    Message,
    Command.HandlerOf<typeof InitializeWithValue>
  >

  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      typeof init,
      ConflictingUpdate,
      EmptyLayer,
      readonly [typeof Initialize, typeof InitializeWithValue]
    >['Conflicting Foldkit handler contracts']
  >().toEqualTypeOf<'Command/Requirements/Initialize'>()
})

it('rejects erased requirements in the implementation channels', () => {
  type ErasedUpdate = (
    model: Model,
    message: Message,
  ) => Update.Return<Model, Message, any>

  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      typeof init,
      ErasedUpdate,
      typeof LoadRoom.layer,
      readonly [typeof Initialize, typeof ReadHostState]
    >['Block requirement sources must preserve exact service types']
  >().toEqualTypeOf<'init, update, or exposed operations'>()
})

it('reports every invalid host definition', () => {
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      readonly ['Invalid']
    >['Block hostHandlers must contain layered Foldkit definitions']
  >().toEqualTypeOf<'Invalid'>()
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      readonly ['InvalidA'] | readonly ['InvalidB']
    >['Block hostHandlers must contain layered Foldkit definitions']
  >().toEqualTypeOf<'InvalidA' | 'InvalidB'>()
  expectTypeOf<
    EmptyCompositionChannels<
      LocalOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      any
    >
  >().toEqualTypeOf<
    Readonly<{
      'Block hostHandlers must contain layered Foldkit definitions': any
    }>
  >()
})

it('declares no host handlers when hostHandlers may be undefined', () => {
  type Missing = EmptyCompositionChannels<
    LocalOwner,
    typeof init,
    typeof update,
    typeof LoadRoom.layer,
    readonly [typeof Initialize] | undefined
  >['Block handler requirements must be provided locally or listed in hostHandlers']
  type Expected =
    | Command.HandlerOf<typeof Initialize>
    | Command.HandlerOf<typeof ReadHostState>

  expectTypeOf<Exclude<Missing, Expected>>().toEqualTypeOf<never>()
  expectTypeOf<Exclude<Expected, Missing>>().toEqualTypeOf<never>()
  expectTypeOf<
    EmptyCompositionChannels<
      DeclaredOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      readonly ['Invalid'] | undefined
    >
  >().toEqualTypeOf<unknown>()
})

it('validates only host definitions for a declared Owner', () => {
  expectTypeOf<
    EmptyCompositionChannels<
      DeclaredOwner,
      typeof init,
      typeof update,
      typeof LoadRoom.layer,
      readonly []
    >
  >().toEqualTypeOf<unknown>()
  expectTypeOf<
    EmptyCompositionChannels<
      DeclaredOwner,
      PlainInit,
      PlainUpdate,
      EmptyLayer,
      readonly ['Invalid']
    >
  >().toEqualTypeOf<
    Readonly<{
      'Block hostHandlers must contain layered Foldkit definitions': 'Invalid'
    }>
  >()
})
