import { Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import type {
  Element as ElementProgram,
  Pending as PendingProgram,
} from 'foldkit/program'
import { defineRouteUnion } from 'foldkit/route'
import * as Struct from 'foldkit/struct'
import * as Update from 'foldkit/update'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <
        Value,
      >() => Value extends Left ? 1 : 2
      ? true
      : false
    : false
type Expect<Value extends true> = Value
type MutuallyAssignable<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsNever<Value> = [Value] extends [never] ? true : false
type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false
type ContainsAnyOrUnknown<Value> =
  IsNever<Value> extends true
    ? false
    : IsAny<Value> extends true
      ? true
      : IsUnknown<Value> extends true
        ? true
        : Value extends object
          ? true extends {
              [Key in keyof Value]-?: ContainsAnyOrUnknown<Value[Key]>
            }[keyof Value]
            ? true
            : false
          : false
type ExactWithoutAnyOrUnknown<Actual, Expected> =
  true extends ContainsAnyOrUnknown<Actual>
    ? false
    : MutuallyAssignable<Actual, Expected>

type ReturnOutMessage<Output> =
  Output extends Update.ResultRecipe<
    infer _Model,
    infer _Message,
    infer OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Exclude<OutMessage, undefined>
    : Output extends unknown
      ? 'outMessage' extends keyof Output
        ? Output extends Readonly<{ outMessage?: infer OutMessage }>
          ? Exclude<OutMessage, undefined>
          : never
        : never
      : never

type ReturnCommandMessage<Output> =
  Output extends Update.ResultRecipe<
    infer _Model,
    infer Message,
    infer _OutMessage,
    infer _Requirements,
    infer _Evidence
  >
    ? Message
    : Output extends Readonly<{ commands?: infer Commands }>
      ? NonNullable<Commands> extends ReadonlyArray<
          // oxlint-disable-next-line typescript/no-explicit-any -- This fixture deliberately probes erased any channels or detects any in an inferred public type.
          Command.Command<infer Message, any, any>
        >
        ? Message
        : never
      : never

type DeliveryOf<Value> =
  Value extends Block.BindingDeliveryEvidence<
    infer OutgoingMessage,
    infer IncomingMessage
  >
    ? readonly [outgoing: OutgoingMessage, incoming: IncomingMessage]
    : never

type DeliveryIsExact<Value, OutgoingMessage, IncomingMessage> =
  DeliveryOf<Value> extends readonly [
    outgoing: infer ActualOutgoingMessage,
    incoming: infer ActualIncomingMessage,
  ]
    ? ExactWithoutAnyOrUnknown<
        ActualOutgoingMessage,
        OutgoingMessage
      > extends true
      ? ExactWithoutAnyOrUnknown<
          ActualIncomingMessage,
          IncomingMessage
        > extends true
        ? true
        : false
      : false
    : false

export const CurrentUser = Schema.Struct({ accountId: Schema.String })
export type CurrentUser = typeof CurrentUser.Type

export const ApplicationRoute = defineRouteUnion({
  Dashboard: {},
  Room: { roomId: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export class SettingsClient extends Context.Service<
  SettingsClient,
  Readonly<{
    sync: (
      accountId: string,
      theme: string,
    ) => Effect.Effect<ReturnType<typeof SettingsMessage.CompletedSync>>
  }>
>()('CompositionAuthoringSettingsClient') {}

export const SettingsModel = Schema.Struct({ theme: Schema.String })
export type SettingsModel = typeof SettingsModel.Type

export const SettingsMessage = defineMessageUnion({
  ChangedTheme: { theme: Schema.String },
  RequestedSync: {},
  CompletedSync: {},
})
export type SettingsMessage = typeof SettingsMessage.Type

export const SettingsOutMessage = defineMessageUnion({
  SelectedTheme: { theme: Schema.String },
})
export type SettingsOutMessage = typeof SettingsOutMessage.Type

const SettingsDefinition = Block.makeDefinition('Settings', {
  Model: SettingsModel,
  Message: SettingsMessage,
  OutMessage: SettingsOutMessage,
})

const handlerConstruction: Effect.Effect<void, 'SettingsHandlerUnavailable'> =
  Effect.void

export const SyncSettings = SettingsDefinition.makeCommand('SyncSettings', {
  args: { accountId: Schema.String, theme: Schema.String },
  messages: [SettingsMessage.CompletedSync],
  handler: function* () {
    const settingsClient = yield* SettingsClient
    yield* handlerConstruction

    return ({ accountId, theme }) => settingsClient.sync(accountId, theme)
  },
})

export const SettingsComposition = SettingsDefinition.makeComposition()
export const settingsInit = SettingsComposition.makeInit((theme: string) => ({
  model: SettingsModel.make({ theme }),
  commands: [SyncSettings({ accountId: 'childInitContext', theme })],
}))
export const settingsUpdate = SettingsComposition.makeUpdate.withContext(
  (currentUser: CurrentUser) => ({
    ChangedTheme: (model, { theme }) => ({
      model: Struct.modifyFields(model, { theme: () => theme }),
      outMessage: SettingsOutMessage.SelectedTheme({ theme }),
    }),
    RequestedSync: model => refreshSettings(model, currentUser),
    CompletedSync: model => ({ model }),
  }),
)
export const refreshSettings = SettingsDefinition.makeStep(
  (model, currentUser: CurrentUser) => ({
    model,
    commands: [
      SyncSettings({
        accountId: currentUser.accountId,
        theme: model.theme,
      }),
    ],
  }),
)

export const SettingsEffectsLayer = SyncSettings.layer
const prepareSettingsBlock = () =>
  SettingsComposition.prepareBlock({
    init: settingsInit,
    update: settingsUpdate,
    operations: {
      refresh: (currentUser: CurrentUser) =>
        Tuple.make(SettingsMessage.RequestedSync(), currentUser),
    },
    EffectsLayer: SettingsEffectsLayer,
  })
export const SettingsBlock: Block.FromAssemblyWithOutMessage<
  typeof SettingsModel,
  typeof prepareSettingsBlock
> = Block.assemble(prepareSettingsBlock)

type SettingsServicesAreExact = Expect<
  Equal<Layer.Services<typeof SettingsEffectsLayer>, SettingsClient>
>
type SettingsErrorIsExact = Expect<
  Equal<Layer.Error<typeof SettingsEffectsLayer>, 'SettingsHandlerUnavailable'>
>
type SettingsUpdateContextIsExact = Expect<
  Equal<
    Parameters<typeof settingsUpdate>,
    [model: SettingsModel, message: SettingsMessage, currentUser: CurrentUser]
  >
>
type SettingsUpdateOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<ReturnType<typeof settingsUpdate>>, SettingsOutMessage>
>
type SettingsUpdateRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof settingsUpdate>,
    Command.HandlerOf<typeof SyncSettings>
  >
>

export type SettingsAssertions = [
  SettingsServicesAreExact,
  SettingsErrorIsExact,
  SettingsUpdateContextIsExact,
  SettingsUpdateOutMessageIsExact,
  SettingsUpdateRequirementsAreExact,
]

export const StatusModel = Schema.Struct({ count: Schema.Number })
export type StatusModel = typeof StatusModel.Type
export const StatusMessage = defineMessageUnion({ Incremented: {} })

const StatusComposition = Block.makeDefinition('Status', {
  Model: StatusModel,
  Message: StatusMessage,
}).makeComposition()
const prepareStatusBlock = () =>
  StatusComposition.prepareBlock({
    init: StatusComposition.makeInit(() => ({
      model: StatusModel.make({ count: 0 }),
    })),
    update: StatusComposition.makeUpdate({
      Incremented: model => ({
        model: Struct.modifyFields(model, { count: count => count + 1 }),
      }),
    }),
    operations: { increment: () => [StatusMessage.Incremented()] },
    EffectsLayer: Layer.empty,
  })
export const StatusBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof StatusModel,
  typeof prepareStatusBlock
> = Block.assemble(prepareStatusBlock)

export const RoomModel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})
export const RoomDispatchContext = Schema.Struct({ roomId: Schema.String })
export type RoomDispatchContext = typeof RoomDispatchContext.Type
export const RoomMessage = defineMessageUnion({
  RenamedRoom: { name: Schema.String },
})

const RoomComposition = Block.makeDefinition('Room', {
  Model: RoomModel,
  Message: RoomMessage,
}).makeComposition()
const prepareRoomBlock = () =>
  RoomComposition.prepareBlock({
    init: RoomComposition.makeInit((id: string, name: string) => ({
      model: RoomModel.make({ id, name }),
    })),
    update: RoomComposition.makeUpdate.withContext(
      (context: RoomDispatchContext) => ({
        RenamedRoom: (model, message) => {
          const roomId: string = context.roomId
          void roomId
          return RoomMessage.match(message, {
            RenamedRoom: ({ name }) => ({
              model: Struct.modifyFields(model, { name: () => name }),
            }),
          })
        },
      }),
    ),
    EffectsLayer: Layer.empty,
  })
export const RoomBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RoomModel,
  typeof prepareRoomBlock
> = Block.assemble(prepareRoomBlock)

export const ParentModel = Schema.Struct({
  settings: SettingsModel,
  status: StatusModel,
  secondaryStatus: StatusModel,
  currentUser: CurrentUser,
  route: ApplicationRoute,
  maybeRoom: Schema.Option(RoomModel),
})
export type ParentModel = typeof ParentModel.Type

export const ParentMessage = defineMessageUnion({
  OpenedDashboard: {},
})
export type ParentMessage = typeof ParentMessage.Type

type ExactArgumentProof<Actual, Expected> =
  ExactWithoutAnyOrUnknown<Actual, Expected> extends true ? [] : [error: never]
type NotAnyOrUnknownProof<Actual> =
  IsAny<Actual> extends true
    ? [error: never]
    : IsUnknown<Actual> extends true
      ? [error: never]
      : []
declare const expectNotAnyOrUnknown: <Actual>(
  value: Actual,
  ...proof: NotAnyOrUnknownProof<Actual>
) => void
declare const expectExactParentStartup: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, ParentChildInitContext>
) => void
declare const expectExactStatusModel: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, StatusModel>
) => void

export const ParentOutMessage = defineMessageUnion({
  SelectedSettingsTheme: { theme: Schema.String },
})
export type ParentOutMessage = typeof ParentOutMessage.Type

export const ParentDefinition = Block.makeDefinition('Parent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

const forwardSettingsOutMessage = ParentDefinition.makeOutMessageForward(
  SettingsBlock,
  {
    SelectedTheme: ({ theme }) =>
      ParentOutMessage.SelectedSettingsTheme({ theme }),
  },
)

export const SettingsBinding = ParentDefinition.makeBinding(SettingsBlock, {
  field: 'settings',
  delivery: {
    toUpdateContext: model => {
      expectNotAnyOrUnknown(model)
      return [model.currentUser]
    },
  },
  init: {
    contextToArgs: (childInitContext: ParentChildInitContext) => {
      expectExactParentStartup(childInitContext)

      return [childInitContext.theme]
    },
  },
}).withOutMessagePolicy({
  forward: forwardSettingsOutMessage,
})

export const StatusBinding = ParentDefinition.makeBinding(StatusBlock, {
  field: 'status',
  init: true,
})

export const ProjectedStatusBinding = ParentDefinition.makeBinding(
  StatusBlock,
  {
    placement: 'secondaryStatus',
    read: model => Option.some(model.secondaryStatus),
    write: (model, nextStatus) =>
      Struct.modifyFields(model, { secondaryStatus: () => nextStatus }),
    init: {
      contextToArgs: () => [],
      toParentFields: status => {
        expectExactStatusModel(status)

        return { secondaryStatus: status }
      },
    },
  },
)

export const RoomBinding = ParentDefinition.makeBinding(RoomBlock, {
  placement: 'room',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  keySchema: RoomModel.fields.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    Struct.modifyFields(model, { maybeRoom: () => Option.some(nextRoom) }),
  delivery: {
    when: (model, roomId) =>
      ApplicationRoute.matchOrElse(
        model.route,
        { Room: route => route.roomId === roomId },
        () => false,
      ),
    toUpdateContext: (_model, roomId) => [{ roomId }],
  },
  subscriptions: {
    when: (model, roomId) =>
      model.route._tag === 'Room' && model.route.roomId === roomId,
  },
})

export const FirstStatusBinding = ParentDefinition.makeBinding(StatusBlock, {
  field: 'status',
  placement: 'firstStatus',
  init: false,
})

export const SecondStatusBinding = ParentDefinition.makeBinding(StatusBlock, {
  field: 'status',
  placement: 'secondStatus',
  init: false,
})

export type ParentChildInitContext = Readonly<{
  theme: string
  currentUser: CurrentUser
  route: ApplicationRoute
}>

export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    SettingsBinding,
    StatusBinding,
    ProjectedStatusBinding,
    RoomBinding,
  ],
})

export const parentInit = ParentComposition.makeInit(
  (childInitContext: ParentChildInitContext) => ({
    childInitContext,
    model: {
      currentUser: childInitContext.currentUser,
      route: childInitContext.route,
      maybeRoom: Option.none(),
    },
    steps: [StatusBinding.increment()],
  }),
)

export const parentUpdate = ParentComposition.makeUpdate({
  OpenedDashboard: (model, message) => {
    const exactMessage: ReturnType<typeof ParentMessage.OpenedDashboard> =
      message
    void exactMessage
    return { model }
  },
})

const policyProofCurrentUser = CurrentUser.make({ accountId: 'policy-proof' })
const directRefresh = SettingsBinding.refresh(policyProofCurrentUser)
export const parentRefreshUpdate = ParentComposition.makeUpdate({
  OpenedDashboard: (model, _message) => directRefresh(model),
})

export const foldSettings = ParentComposition.makeUpdate.withContext(
  (childMessage: typeof SettingsMessage.Type, currentUser: CurrentUser) => ({
    OpenedDashboard: (model, _message) =>
      SettingsBinding.fold(model, childMessage, currentUser),
  }),
)
export const foldStatus = ParentComposition.makeUpdate.withContext(
  (childMessage: typeof StatusMessage.Type) => ({
    OpenedDashboard: (model, _message) =>
      StatusBinding.fold(model, childMessage),
  }),
)
export const foldRoom = ParentComposition.makeUpdate.withContext(
  (
    roomId: string,
    childMessage: typeof RoomMessage.Type,
    context: RoomDispatchContext,
  ) => ({
    OpenedDashboard: (model, _message) =>
      RoomBinding.fold(model, roomId, childMessage, context),
  }),
)

const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: parentInit,
    update: parentUpdate,
    EffectsLayer: Layer.empty,
  })
export const ParentBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

const prepareParentRefreshBlock = () =>
  ParentComposition.prepareBlock({
    init: parentInit,
    update: parentRefreshUpdate,
    operations: {
      refreshSettings: () => Tuple.make(ParentMessage.OpenedDashboard()),
    },
    EffectsLayer: Layer.empty,
  })
export const ParentRefreshBlock: Block.FromAssemblyWithOutMessage<
  typeof ParentModel,
  typeof prepareParentRefreshBlock
> = Block.assemble(prepareParentRefreshBlock)

type ParentInitParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentInit>,
    [childInitContext: ParentChildInitContext]
  >
>
type ParentInitModelIsExact = Expect<
  Equal<ReturnType<typeof parentInit>['model'], ParentModel>
>
type ParentInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof parentInit>,
    Block.Scoped<'settings', Command.HandlerOf<typeof SyncSettings>>
  >
>
type ParentInitRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof parentInit>>,
    | Block.RequirementOfBinding<typeof SettingsBinding>
    | Block.RequirementOfBinding<typeof StatusBinding>
    | Block.RequirementOfBinding<typeof ProjectedStatusBinding>
  >
>
type ParentUpdateParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentUpdate>,
    [model: ParentModel, message: typeof ParentComposition.Message.Type]
  >
>
type ParentUpdateOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<ReturnType<typeof parentUpdate>>, ParentOutMessage>
>
type DirectRefreshOutMessageIsOpaque = Expect<
  Equal<ReturnOutMessage<ReturnType<typeof directRefresh>>, never>
>
type ParentRefreshMessageIsExact = Expect<
  Equal<
    ReturnCommandMessage<ReturnType<typeof parentRefreshUpdate>>,
    typeof ParentComposition.Message.Type
  >
>
type ParentRefreshRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof parentRefreshUpdate>,
    Block.Scoped<'settings', Command.HandlerOf<typeof SyncSettings>>
  >
>
type ParentRefreshOutMessageIsResolved = Expect<
  Equal<
    ReturnOutMessage<ReturnType<typeof parentRefreshUpdate>>,
    ParentOutMessage
  >
>
type ExposedRefreshRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof ParentRefreshBlock.operations.refreshSettings>,
    Block.Scoped<'settings', Command.HandlerOf<typeof SyncSettings>>
  >
>
type ExposedRefreshOutMessageIsResolved = Expect<
  Equal<
    ReturnOutMessage<
      ReturnType<typeof ParentRefreshBlock.operations.refreshSettings>
    >,
    never
  >
>
type GeneratedMessageOf<BindingValue> =
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture rejects erased generated delivery channels below.
  BindingValue extends Block.BindingDeliveryEvidence<any, any, infer Schema>
    ? Schema extends import('effect').Schema.Top
      ? Schema['Type']
      : never
    : never
type SettingsDeliveryMessage = GeneratedMessageOf<typeof SettingsBinding>
type StatusDeliveryMessage = GeneratedMessageOf<typeof StatusBinding>
type RoomDeliveryMessage = GeneratedMessageOf<typeof RoomBinding>
type FirstStatusDeliveryMessage = GeneratedMessageOf<typeof FirstStatusBinding>
type SecondStatusDeliveryMessage = GeneratedMessageOf<
  typeof SecondStatusBinding
>
type ProjectedStatusDeliveryMessage = GeneratedMessageOf<
  typeof ProjectedStatusBinding
>
type SettingsDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof SettingsBinding>,
    SettingsDeliveryMessage
  >
>
type StatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof StatusBinding>,
    StatusDeliveryMessage
  >
>
type RoomDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof RoomBinding>,
    RoomDeliveryMessage
  >
>
type FirstStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof FirstStatusBinding>,
    FirstStatusDeliveryMessage
  >
>
type SecondStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof SecondStatusBinding>,
    SecondStatusDeliveryMessage
  >
>
type ProjectedStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof ProjectedStatusBinding>,
    ProjectedStatusDeliveryMessage
  >
>
type DeliveryComparatorRejectsAnyOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        // oxlint-disable-next-line typescript/no-explicit-any
        any,
        RoomDeliveryMessage
      >,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsAnyIncoming = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        RoomDeliveryMessage,
        // oxlint-disable-next-line typescript/no-explicit-any
        any
      >,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsUnknownOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<unknown, RoomDeliveryMessage>,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsNestedAny = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        Omit<RoomDeliveryMessage, 'message'> &
          // oxlint-disable-next-line typescript/no-explicit-any
          Readonly<{ message: any }>,
        RoomDeliveryMessage
      >,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsNestedUnknown = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        Omit<RoomDeliveryMessage, 'roomId'> & Readonly<{ roomId: unknown }>,
        RoomDeliveryMessage
      >,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsBroadOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<ParentMessage, RoomDeliveryMessage>,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type DeliveryComparatorRejectsBroadIncoming = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<RoomDeliveryMessage, ParentMessage>,
      RoomDeliveryMessage,
      RoomDeliveryMessage
    >,
    false
  >
>
type RoomOutgoingMessage = RoomDeliveryMessage
type RoomIncomingMessage = RoomDeliveryMessage
type RoomOutgoingTagIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomOutgoingMessage['_tag'], 'GotRoomMessage'>
>
type RoomOutgoingKeyIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomOutgoingMessage['key'], string>
>
type RoomOutgoingPayloadIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    RoomOutgoingMessage['message'],
    typeof RoomMessage.Type
  >
>
type RoomIncomingTagIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomIncomingMessage['_tag'], 'GotRoomMessage'>
>
type RoomIncomingKeyIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomIncomingMessage['key'], string>
>
type RoomIncomingPayloadIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    RoomIncomingMessage['message'],
    typeof RoomMessage.Type
  >
>
type ProjectedStatusInitialEvidenceIsExact = Expect<
  typeof ProjectedStatusBinding extends Block.InitialBindingEvidence<
    'secondaryStatus',
    StatusModel,
    never,
    never,
    Block.RequirementOfBinding<typeof ProjectedStatusBinding>
  >
    ? true
    : false
>

export type ParentAssertions = [
  ParentInitParametersAreExact,
  ParentInitModelIsExact,
  ParentInitRequirementsAreExact,
  ParentInitRegistrationIsExact,
  ParentUpdateParametersAreExact,
  ParentUpdateOutMessageIsExact,
  DirectRefreshOutMessageIsOpaque,
  ParentRefreshMessageIsExact,
  ParentRefreshRequirementsAreExact,
  ParentRefreshOutMessageIsResolved,
  ExposedRefreshRequirementsAreExact,
  ExposedRefreshOutMessageIsResolved,
  SettingsDeliveryIsExact,
  StatusDeliveryIsExact,
  RoomDeliveryIsExact,
  FirstStatusDeliveryIsExact,
  SecondStatusDeliveryIsExact,
  ProjectedStatusDeliveryIsExact,
  DeliveryComparatorRejectsAnyOutgoing,
  DeliveryComparatorRejectsAnyIncoming,
  DeliveryComparatorRejectsUnknownOutgoing,
  DeliveryComparatorRejectsNestedAny,
  DeliveryComparatorRejectsNestedUnknown,
  DeliveryComparatorRejectsBroadOutgoing,
  DeliveryComparatorRejectsBroadIncoming,
  RoomOutgoingTagIsExact,
  RoomOutgoingKeyIsExact,
  RoomOutgoingPayloadIsExact,
  RoomIncomingTagIsExact,
  RoomIncomingKeyIsExact,
  RoomIncomingPayloadIsExact,
  ProjectedStatusInitialEvidenceIsExact,
]

export const ApplicationModel = Schema.Struct({ count: Schema.Number })
export type ApplicationModel = typeof ApplicationModel.Type
export const ApplicationMessage = defineMessageUnion({ Incremented: {} })
export type ApplicationMessage = typeof ApplicationMessage.Type

export const ApplicationComposition = Block.makeDefinition('Application', {
  Model: ApplicationModel,
  Message: ApplicationMessage,
}).makeComposition()
export const applicationInit = ApplicationComposition.makeInit(() => ({
  model: ApplicationModel.make({ count: 0 }),
}))
export const applicationDefaultInit = ApplicationComposition.makeInit(
  (count = 0) => ({ model: ApplicationModel.make({ count }) }),
)
export const applicationReadonlyRestInit = ApplicationComposition.makeInit(
  (...counts: readonly number[]) => ({
    model: ApplicationModel.make({ count: counts.length }),
  }),
)
export const applicationUndefinedDefaultInit = applicationDefaultInit(undefined)
export const applicationUpdate = ApplicationComposition.makeUpdate({
  Incremented: model => ({
    model: Struct.modifyFields(model, { count: count => count + 1 }),
  }),
})
export const applicationView = ApplicationComposition.makeView((model, h) =>
  h.main([], [globalThis.String(model.count)]),
)

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init: applicationInit,
    update: applicationUpdate,
    view: applicationView,
  })
const completedBlock: Block.FromAssemblyWithView<
  typeof ApplicationModel,
  typeof prepare
> = Block.assemble(prepare)
export const ApplicationElement = Program.makeElement({
  block: completedBlock,
  container: null,
})

type ApplicationInitModelIsExact = Expect<
  Equal<ReturnType<typeof applicationInit>['model'], ApplicationModel>
>
type ApplicationDefaultInitParametersAreExact = Expect<
  Equal<Parameters<typeof applicationDefaultInit>, [count?: number | undefined]>
>
type ApplicationReadonlyRestInitParametersAreExact = Expect<
  Equal<Parameters<typeof applicationReadonlyRestInit>, number[]>
>
type ApplicationUpdateParametersAreExact = Expect<
  Equal<
    Parameters<typeof applicationUpdate>,
    [model: ApplicationModel, message: ApplicationMessage]
  >
>
type ApplicationElementIsExact = Expect<
  Equal<
    typeof ApplicationElement,
    ElementProgram<undefined, never, never, never>
  >
>

export type ApplicationAssertions = [
  ApplicationInitModelIsExact,
  ApplicationDefaultInitParametersAreExact,
  ApplicationReadonlyRestInitParametersAreExact,
  ApplicationUpdateParametersAreExact,
  ApplicationElementIsExact,
]

export class ApplicationClient extends Context.Service<
  ApplicationClient,
  Readonly<{ run: Effect.Effect<void> }>
>()('CompositionAuthoringApplicationClient') {}

export const ServiceApplicationModel = Schema.Struct({ count: Schema.Number })
export const ServiceApplicationMessage = defineMessageUnion({
  RequestedApplicationTask: {},
  CompletedRunApplicationTask: {},
})

// oxlint-disable-next-line foldkit/block-name-matches-variable
const ServiceApplicationDefinition = Block.makeDefinition('Application', {
  Model: ServiceApplicationModel,
  Message: ServiceApplicationMessage,
})

export const RunApplicationTask = ServiceApplicationDefinition.makeCommand(
  'RunApplicationTask',
  {
    messages: [ServiceApplicationMessage.CompletedRunApplicationTask],
    handler: function* () {
      const applicationClient = yield* ApplicationClient

      return () =>
        applicationClient.run.pipe(
          Effect.as(ServiceApplicationMessage.CompletedRunApplicationTask()),
        )
    },
  },
)

// oxlint-disable-next-line foldkit/block-name-matches-variable
export const ServiceApplicationComposition =
  ServiceApplicationDefinition.makeComposition()
export const serviceApplicationInit = ServiceApplicationComposition.makeInit(
  () => ({ model: ServiceApplicationModel.make({ count: 0 }) }),
)
export const serviceApplicationUpdate =
  ServiceApplicationComposition.makeUpdate({
    RequestedApplicationTask: model => ({
      model,
      commands: [RunApplicationTask()],
    }),
    CompletedRunApplicationTask: model => ({ model }),
  })
export const serviceApplicationView = ServiceApplicationComposition.makeView(
  (model, h) => h.main([], [globalThis.String(model.count)]),
)

const prepare2 = () =>
  ServiceApplicationComposition.prepareBlock({
    init: serviceApplicationInit,
    update: serviceApplicationUpdate,
    view: serviceApplicationView,
    EffectsLayer: RunApplicationTask.layer,
  })
const completedBlock2: Block.FromAssemblyWithView<
  typeof ServiceApplicationModel,
  typeof prepare2
> = Block.assemble(prepare2)
export const PendingServiceApplicationElement = Program.makeElement({
  block: completedBlock2,
  container: null,
})

export const ApplicationClientLayer = Layer.succeed(ApplicationClient, {
  run: Effect.void,
})
export const ProvidedServiceApplicationElement =
  PendingServiceApplicationElement.provide(ApplicationClientLayer)

type PendingServiceApplicationElementIsExact = Expect<
  Equal<
    typeof PendingServiceApplicationElement,
    PendingProgram<
      undefined,
      void,
      ApplicationClient,
      never,
      Command.HandlerOf<typeof RunApplicationTask>,
      'Element'
    >
  >
>
type ProvidedServiceApplicationElementIsExact = Expect<
  Equal<
    typeof ProvidedServiceApplicationElement,
    ElementProgram<
      undefined,
      never,
      never,
      ApplicationClient | Command.HandlerOf<typeof RunApplicationTask>
    >
  >
>

export type ServiceApplicationAssertions = [
  PendingServiceApplicationElementIsExact,
  ProvidedServiceApplicationElementIsExact,
]

export const NoStartupModel = Schema.Struct({ status: StatusModel })
const NoStartupDefinition = Block.makeDefinition('NoStartup', {
  Model: NoStartupModel,
  Message: Schema.Never,
})
const NoStartupStatusBinding = NoStartupDefinition.makeBinding(StatusBlock, {
  field: 'status',
  init: true,
})
export const NoStartupComposition = NoStartupDefinition.makeComposition({
  bindings: [NoStartupStatusBinding],
})
export const noStartupInit = NoStartupComposition.makeInit(() => ({
  model: {},
}))

const InitializationMetadata = Symbol('InitializationMetadata')
export const symbolMetadataInit = NoStartupComposition.makeInit(() => ({
  model: {},
  childInitContext: { source: 'declaration-test' },
  [InitializationMetadata]: true,
}))
const prepareNoStartupBlock = () =>
  NoStartupComposition.prepareBlock({
    init: noStartupInit,
    update: NoStartupComposition.makeUpdate({}),
  })
export const NoStartupBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof NoStartupModel,
  typeof prepareNoStartupBlock
> = Block.assemble(prepareNoStartupBlock)
export type NoStartupArgumentsAreExact = Expect<
  Equal<Parameters<typeof noStartupInit>, []>
>
export type NoStartupModelIsExact = Expect<
  Equal<ReturnType<typeof noStartupInit>['model'], typeof NoStartupModel.Type>
>
