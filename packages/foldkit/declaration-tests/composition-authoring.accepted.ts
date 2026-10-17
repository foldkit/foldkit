import { Context, Effect, Layer, Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import type {
  Element as ElementProgram,
  PendingApplication,
} from 'foldkit/application'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
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

const Settings = Block.define('Settings', {
  Model: SettingsModel,
  Message: SettingsMessage,
  OutMessage: SettingsOutMessage,
})

const handlerConstruction: Effect.Effect<void, 'SettingsHandlerUnavailable'> =
  Effect.void

export const SyncSettings = Settings.command('SyncSettings', {
  args: { accountId: Schema.String, theme: Schema.String },
  messages: [SettingsMessage.CompletedSync],
  handler: function* () {
    const settingsClient = yield* SettingsClient
    yield* handlerConstruction

    return ({ accountId, theme }) => settingsClient.sync(accountId, theme)
  },
})

export const SettingsComposition = Settings.makeComposition()
export const settingsInit = SettingsComposition.makeInit((theme: string) => ({
  model: SettingsModel.make({ theme }),
  commands: [SyncSettings({ accountId: 'startup', theme })],
}))
export const settingsUpdate = SettingsComposition.makeUpdate(
  (model, message, currentUser: CurrentUser) =>
    SettingsMessage.match(message, {
      ChangedTheme: ({ theme }) => ({
        model: Struct.modifyFields(model, { theme: () => theme }),
        outMessage: SettingsOutMessage.SelectedTheme({ theme }),
      }),
      RequestedSync: () => ({
        model,
        commands: [
          SyncSettings({
            accountId: currentUser.accountId,
            theme: model.theme,
          }),
        ],
      }),
      CompletedSync: () => ({ model }),
    }),
)
export const refreshSettings = Settings.step(
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
export const SettingsBlock = SettingsComposition.makeBlock({
  init: settingsInit,
  update: settingsUpdate,
  expose: { refresh: refreshSettings },
  EffectsLayer: SettingsEffectsLayer,
})

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
export type StatusMessage = typeof StatusMessage.Type

const Status = Block.define('Status', {
  Model: StatusModel,
  Message: StatusMessage,
})
const StatusComposition = Status.makeComposition()
export const StatusBlock = StatusComposition.makeBlock({
  init: StatusComposition.makeInit(() => ({
    model: StatusModel.make({ count: 0 }),
  })),
  update: StatusComposition.makeUpdate(model => ({
    model: Struct.modifyFields(model, { count: count => count + 1 }),
  })),
  EffectsLayer: Layer.empty,
})

export const RoomModel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})
export type RoomModel = typeof RoomModel.Type
export const RoomDispatchContext = Schema.Struct({ roomId: Schema.String })
export type RoomDispatchContext = typeof RoomDispatchContext.Type
export const RoomMessage = defineMessageUnion({
  RenamedRoom: { name: Schema.String },
})
export type RoomMessage = typeof RoomMessage.Type

const Room = Block.define('Room', {
  Model: RoomModel,
  Message: RoomMessage,
})
const RoomComposition = Room.makeComposition()
export const RoomBlock = RoomComposition.makeBlock({
  init: RoomComposition.makeInit((id: string, name: string) => ({
    model: RoomModel.make({ id, name }),
  })),
  update: RoomComposition.makeUpdate(
    (model, message, context: RoomDispatchContext) => {
      const roomId: string = context.roomId
      void roomId

      return RoomMessage.match(message, {
        RenamedRoom: ({ name }) => ({
          model: Struct.modifyFields(model, { name: () => name }),
        }),
      })
    },
  ),
  EffectsLayer: Layer.empty,
})

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
  GotSettingsMessage: { message: SettingsBlock.Message },
  GotStatusMessage: { message: StatusBlock.Message },
  GotRoomMessage: { roomId: Schema.String, message: RoomBlock.Message },
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
  ...proof: ExactArgumentProof<Actual, ParentStartup>
) => void
declare const expectExactSettingsMessage: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, SettingsMessage>
) => void
declare const expectExactStatusModel: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, StatusModel>
) => void
declare const expectExactRoomKey: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, string>
) => void
declare const expectExactRoomMessage: <Actual>(
  value: Actual,
  ...proof: ExactArgumentProof<Actual, RoomMessage>
) => void

export const ParentOutMessage = defineMessageUnion({
  SelectedSettingsTheme: { theme: Schema.String },
})
export type ParentOutMessage = typeof ParentOutMessage.Type

export const Parent = Block.define('Parent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

export const SettingsBinding = Parent.bindChild(SettingsBlock, {
  field: 'settings',
  parentMessage: ParentMessage.GotSettingsMessage,
  fromParentMessage: {
    args: (model, { message }) => {
      expectNotAnyOrUnknown(model)
      type ParentModelContextIsExact = Expect<
        MutuallyAssignable<typeof model, ParentModel>
      >
      const parentModelContextIsExact: ParentModelContextIsExact = true
      void parentModelContextIsExact
      expectExactSettingsMessage(message)

      return Option.some([message, model.currentUser])
    },
  },
  init: {
    args: (startup: ParentStartup) => {
      expectExactParentStartup(startup)

      return [startup.theme]
    },
  },
  outMessage: {
    forward: outMessage =>
      SettingsOutMessage.match(outMessage, {
        SelectedTheme: ({ theme }) =>
          ParentOutMessage.SelectedSettingsTheme({ theme }),
      }),
  },
})

export const StatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  parentMessage: ParentMessage.GotStatusMessage,
  init: true,
})

export const ProjectedStatusBinding = Parent.bindChild(StatusBlock, {
  placement: 'secondaryStatus',
  read: model => Option.some(model.secondaryStatus),
  write: (model, nextStatus) =>
    Struct.modifyFields(model, { secondaryStatus: () => nextStatus }),
  toParentMessage: () => ParentMessage.OpenedDashboard(),
  fromParentMessage: false,
  init: {
    args: () => [],
    model: status => {
      expectExactStatusModel(status)

      return { secondaryStatus: status }
    },
  },
})

export const RoomBinding = Parent.bindChild(RoomBlock, {
  placement: 'room',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    Struct.modifyFields(model, { maybeRoom: () => Option.some(nextRoom) }),
  toParentMessage: (roomId, message) => {
    expectExactRoomKey(roomId)
    expectExactRoomMessage(message)

    return ParentMessage.GotRoomMessage({ roomId, message })
  },
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (model, { roomId, message }) => {
      expectNotAnyOrUnknown(model)
      type ParentModelContextIsExact = Expect<
        MutuallyAssignable<typeof model, ParentModel>
      >
      const parentModelContextIsExact: ParentModelContextIsExact = true
      void parentModelContextIsExact
      expectExactRoomKey(roomId)
      expectExactRoomMessage(message)

      return ApplicationRoute.matchOrElse(
        model.route,
        {
          Room: route => route.roomId === roomId,
        },
        () => false,
      )
        ? Option.some([roomId, message, { roomId }])
        : Option.none()
    },
  },
  subscriptions: {
    when: (model, roomId) =>
      model.route._tag === 'Room' && model.route.roomId === roomId,
  },
})

export const FirstManualStatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  placement: 'firstManualStatus',
  parentMessage: ParentMessage.GotStatusMessage,
  fromParentMessage: false,
  init: false,
})

export const SecondManualStatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  placement: 'secondManualStatus',
  parentMessage: ParentMessage.GotStatusMessage,
  fromParentMessage: false,
  init: false,
})

// oxlint-disable-next-line foldkit/block-name-matches-variable
export const ManualDeliveryComposition = Parent.makeComposition({
  childBindings: [FirstManualStatusBinding, SecondManualStatusBinding],
})
export const manualDeliveryUpdate = ManualDeliveryComposition.makeUpdate(
  model => ({
    model,
  }),
)

export type ParentStartup = Readonly<{
  theme: string
  currentUser: CurrentUser
  route: ApplicationRoute
}>

export const ParentComposition = Parent.makeComposition({
  childBindings: [
    SettingsBinding,
    StatusBinding,
    ProjectedStatusBinding,
    RoomBinding,
  ],
})

export const parentInit = ParentComposition.makeInit(
  (startup: ParentStartup) => ({
    startup,
    model: {
      currentUser: startup.currentUser,
      route: startup.route,
      maybeRoom: Option.none(),
    },
    steps: [SettingsBinding.refresh(startup.currentUser)],
  }),
)

export const parentUpdate = ParentComposition.makeUpdate((model, message) => {
  const exactMessage: ReturnType<typeof ParentMessage.OpenedDashboard> = message
  void exactMessage

  return { model }
})

export const foldSettings = ParentComposition.makeUpdate(
  (
    model,
    _message,
    childMessage: typeof SettingsMessage.Type,
    currentUser: CurrentUser,
  ) => SettingsBinding.fold(model, childMessage, currentUser),
)
export const foldStatus = ParentComposition.makeUpdate(
  (model, _message, childMessage: typeof StatusMessage.Type) =>
    StatusBinding.fold(model, childMessage),
)
export const foldRoom = ParentComposition.makeUpdate(
  (
    model,
    _message,
    roomId: string,
    childMessage: typeof RoomMessage.Type,
    context: RoomDispatchContext,
  ) => RoomBinding.fold(model, roomId, childMessage, context),
)

export const ParentBlock = ParentComposition.makeBlock({
  init: parentInit,
  update: parentUpdate,
  EffectsLayer: Layer.empty,
})

type ParentInitParametersAreExact = Expect<
  Equal<Parameters<typeof parentInit>, [startup: ParentStartup]>
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
    | Block.BindingRequirement<'settings', typeof SettingsBlock>
    | Block.BindingRequirement<'status', typeof StatusBlock>
    | Block.BindingRequirement<'secondaryStatus', typeof StatusBlock>
  >
>
type ParentUpdateParametersAreExact = Expect<
  Equal<
    Parameters<typeof parentUpdate>,
    [model: ParentModel, message: ParentMessage]
  >
>
type ParentUpdateOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<ReturnType<typeof parentUpdate>>, ParentOutMessage>
>
type SettingsDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof SettingsBinding,
    ReturnType<typeof ParentMessage.GotSettingsMessage>,
    ReturnType<typeof ParentMessage.GotSettingsMessage>
  >
>
type StatusDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof StatusBinding,
    ReturnType<typeof ParentMessage.GotStatusMessage>,
    ReturnType<typeof ParentMessage.GotStatusMessage>
  >
>
type RoomDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof RoomBinding,
    ReturnType<typeof ParentMessage.GotRoomMessage>,
    ReturnType<typeof ParentMessage.GotRoomMessage>
  >
>
type FirstManualStatusDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof FirstManualStatusBinding,
    ReturnType<typeof ParentMessage.GotStatusMessage>,
    never
  >
>
type SecondManualStatusDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof SecondManualStatusBinding,
    ReturnType<typeof ParentMessage.GotStatusMessage>,
    never
  >
>
type ProjectedStatusDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof ProjectedStatusBinding,
    ReturnType<typeof ParentMessage.OpenedDashboard>,
    never
  >
>
type DeliveryComparatorRejectsAnyOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        // oxlint-disable-next-line typescript/no-explicit-any
        any,
        ReturnType<typeof ParentMessage.GotRoomMessage>
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsAnyIncoming = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        ReturnType<typeof ParentMessage.GotRoomMessage>,
        // oxlint-disable-next-line typescript/no-explicit-any
        any
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsUnknownOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        unknown,
        ReturnType<typeof ParentMessage.GotRoomMessage>
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsNestedAny = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        Omit<ReturnType<typeof ParentMessage.GotRoomMessage>, 'message'> &
          // oxlint-disable-next-line typescript/no-explicit-any
          Readonly<{ message: any }>,
        ReturnType<typeof ParentMessage.GotRoomMessage>
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsNestedUnknown = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        Omit<ReturnType<typeof ParentMessage.GotRoomMessage>, 'roomId'> &
          Readonly<{ roomId: unknown }>,
        ReturnType<typeof ParentMessage.GotRoomMessage>
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsBroadOutgoing = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        ParentMessage,
        ReturnType<typeof ParentMessage.GotRoomMessage>
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type DeliveryComparatorRejectsBroadIncoming = Expect<
  Equal<
    DeliveryIsExact<
      Block.BindingDeliveryEvidence<
        ReturnType<typeof ParentMessage.GotRoomMessage>,
        ParentMessage
      >,
      ReturnType<typeof ParentMessage.GotRoomMessage>,
      ReturnType<typeof ParentMessage.GotRoomMessage>
    >,
    false
  >
>
type RoomOutgoingMessage = DeliveryOf<typeof RoomBinding>[0]
type RoomIncomingMessage = DeliveryOf<typeof RoomBinding>[1]
type RoomOutgoingTagIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomOutgoingMessage['_tag'], 'GotRoomMessage'>
>
type RoomOutgoingKeyIsExact = Expect<
  ExactWithoutAnyOrUnknown<RoomOutgoingMessage['roomId'], string>
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
  ExactWithoutAnyOrUnknown<RoomIncomingMessage['roomId'], string>
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
    Block.BindingRequirement<'secondaryStatus', typeof StatusBlock>
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
  SettingsDeliveryIsExact,
  StatusDeliveryIsExact,
  RoomDeliveryIsExact,
  FirstManualStatusDeliveryIsExact,
  SecondManualStatusDeliveryIsExact,
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

const Application = defineApplication({
  Model: ApplicationModel,
  Message: ApplicationMessage,
})

export const ApplicationComposition = Application.makeComposition()
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
export const applicationUpdate = ApplicationComposition.makeUpdate(model => ({
  model: Struct.modifyFields(model, { count: count => count + 1 }),
}))
export const applicationView = ApplicationComposition.makeView((model, h) =>
  h.main([], [globalThis.String(model.count)]),
)
export const ApplicationElement = ApplicationComposition.makeElement({
  container: null,
  init: applicationInit,
  update: applicationUpdate,
  view: applicationView,
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
const ServiceApplication = defineApplication({
  Model: ServiceApplicationModel,
  Message: ServiceApplicationMessage,
})

export const RunApplicationTask = ServiceApplication.command(
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
  ServiceApplication.makeComposition()
export const serviceApplicationInit = ServiceApplicationComposition.makeInit(
  () => ({ model: ServiceApplicationModel.make({ count: 0 }) }),
)
export const serviceApplicationUpdate =
  ServiceApplicationComposition.makeUpdate((model, message) =>
    ServiceApplicationMessage.match(message, {
      RequestedApplicationTask: () => ({
        model,
        commands: [RunApplicationTask()],
      }),
      CompletedRunApplicationTask: () => ({ model }),
    }),
  )
export const serviceApplicationView = ServiceApplicationComposition.makeView(
  (model, h) => h.main([], [globalThis.String(model.count)]),
)

export const PendingServiceApplicationElement =
  ServiceApplicationComposition.makeElement({
    container: null,
    init: serviceApplicationInit,
    update: serviceApplicationUpdate,
    view: serviceApplicationView,
    EffectsLayer: RunApplicationTask.layer,
  })

export const ApplicationClientLayer = Layer.succeed(ApplicationClient, {
  run: Effect.void,
})
export const ProvidedServiceApplicationElement =
  PendingServiceApplicationElement.provide(ApplicationClientLayer)

type PendingServiceApplicationElementIsExact = Expect<
  Equal<
    typeof PendingServiceApplicationElement,
    PendingApplication<
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
export const NoStartupMessage = defineMessageUnion({
  GotStatusMessage: { message: StatusBlock.Message },
})
const NoStartup = Block.define('NoStartup', {
  Model: NoStartupModel,
  Message: NoStartupMessage,
})
const NoStartupStatusBinding = NoStartup.bindChild(StatusBlock, {
  field: 'status',
  parentMessage: NoStartupMessage.GotStatusMessage,
  init: true,
})
export const NoStartupComposition = NoStartup.makeComposition({
  childBindings: [NoStartupStatusBinding],
})
export const noStartupInit = NoStartupComposition.makeInit(() => ({
  model: {},
}))
export const NoStartupBlock = NoStartupComposition.makeBlock({
  init: noStartupInit,
  update: NoStartupComposition.makeUpdate(),
})
export type NoStartupArgumentsAreExact = Expect<
  Equal<Parameters<typeof noStartupInit>, []>
>
export type NoStartupModelIsExact = Expect<
  Equal<ReturnType<typeof noStartupInit>['model'], typeof NoStartupModel.Type>
>
