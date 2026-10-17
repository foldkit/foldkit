import { Layer, Option } from 'effect'
import { Runtime, Struct } from 'foldkit'
import type { Element as ElementProgram } from 'foldkit/application'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import * as Update from 'foldkit/update'

import {
  ApplicationClient,
  ApplicationClientLayer,
  ApplicationComposition,
  ApplicationElement,
  ApplicationMessage,
  type ApplicationModel,
  ApplicationRoute,
  CurrentUser,
  FirstManualStatusBinding,
  ManualDeliveryComposition,
  ParentComposition,
  ParentMessage,
  type ParentModel,
  type ParentOutMessage,
  type ParentStartup,
  PendingServiceApplicationElement,
  ProjectedStatusBinding,
  ProvidedServiceApplicationElement,
  RoomBinding,
  RoomBlock,
  type RoomDispatchContext,
  RoomMessage,
  RunApplicationTask,
  SecondManualStatusBinding,
  SettingsBinding,
  SettingsBlock,
  SettingsClient,
  SettingsEffectsLayer,
  SettingsMessage,
  type SettingsModel,
  type SettingsOutMessage,
  StatusBinding,
  StatusBlock,
  StatusMessage,
  type StatusModel,
  SyncSettings,
  applicationDefaultInit,
  applicationInit,
  applicationReadonlyRestInit,
  applicationUpdate,
  applicationView,
  foldRoom,
  foldSettings,
  foldStatus,
  manualDeliveryUpdate,
  parentInit,
  parentUpdate,
  settingsInit,
  settingsUpdate,
} from './composition-authoring.accepted.js'

export {
  PendingServiceApplicationElement as EmittedPendingServiceApplicationElement,
  ProvidedServiceApplicationElement as EmittedProvidedServiceApplicationElement,
}

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

const currentUser = CurrentUser.make({ accountId: 'emitted-user' })
const startup: ParentStartup = {
  theme: 'Dark',
  currentUser,
  route: ApplicationRoute.Room({ roomId: 'room-1' }),
}

export const emittedSettingsInit = settingsInit('Light')
export const emittedParentInit = parentInit(startup)
const initializeProjectedStatus = ParentComposition.makeInit(() =>
  ProjectedStatusBinding.init({
    args: [],
    toParentModel: status =>
      Struct.modifyFields(emittedParentInit.model, {
        secondaryStatus: () => status,
      }),
  }),
)
export const emittedProjectedStatusInit = initializeProjectedStatus()
export const emittedSettingsUpdate = settingsUpdate(
  emittedParentInit.model.settings,
  SettingsMessage.RequestedSync(),
  currentUser,
)
export const emittedParentUpdate = parentUpdate(
  emittedParentInit.model,
  ParentMessage.GotSettingsMessage({
    message: SettingsMessage.ChangedTheme({ theme: 'Light' }),
  }),
)
export const emittedDefaultRouteUpdate = parentUpdate(
  emittedParentInit.model,
  ParentMessage.GotStatusMessage({ message: StatusMessage.Incremented() }),
)
export const emittedKeyedRouteUpdate = parentUpdate(
  emittedParentInit.model,
  ParentMessage.GotRoomMessage({
    roomId: 'room-1',
    message: RoomMessage.RenamedRoom({ name: 'Main room' }),
  }),
)

export const emittedCompositionInit = ParentComposition.makeInit(
  (nextStartup: ParentStartup) => ({
    startup: nextStartup,
    model: {
      currentUser: nextStartup.currentUser,
      route: nextStartup.route,
      maybeRoom: Option.none(),
    },
    steps: [SettingsBinding.refresh(nextStartup.currentUser)],
  }),
)

export const emittedCompositionUpdate = ParentComposition.makeUpdate(
  (model, message) => {
    const exactMessage: ReturnType<typeof ParentMessage.OpenedDashboard> =
      message
    void exactMessage

    return { model }
  },
)

const authoredMessage = ParentMessage.OpenedDashboard()

export const emittedSettingsFold = foldSettings(
  emittedParentInit.model,
  authoredMessage,
  SettingsMessage.RequestedSync(),
  currentUser,
)
export const emittedStatusFold = foldStatus(
  emittedParentInit.model,
  authoredMessage,
  StatusMessage.Incremented(),
)
export const emittedRoomFold = foldRoom(
  emittedParentInit.model,
  authoredMessage,
  'room-1',
  RoomMessage.RenamedRoom({ name: 'Renamed room' }),
  { roomId: 'room-1' },
)
export const emittedManualDeliveryUpdate = manualDeliveryUpdate(
  emittedParentInit.model,
  ParentMessage.GotStatusMessage({ message: StatusMessage.Incremented() }),
)
export const emittedManualCompositionUpdate =
  ManualDeliveryComposition.makeUpdate(model => ({ model }))

export const emittedApplicationInit = applicationInit()
export const emittedApplicationDefaultInit = applicationDefaultInit()
export const emittedApplicationDefaultValueInit = applicationDefaultInit(2)
export const emittedApplicationUndefinedDefaultInit =
  applicationDefaultInit(undefined)
export const emittedApplicationReadonlyRestInit = applicationReadonlyRestInit(
  1,
  2,
  3,
)

// @ts-expect-error The emitted defaulted numeric initializer rejects strings.
applicationDefaultInit('wrong')

// @ts-expect-error The emitted numeric rest initializer rejects strings.
applicationReadonlyRestInit('wrong')

export const emittedApplicationUpdate = applicationUpdate(
  emittedApplicationInit.model,
  ApplicationMessage.Incremented(),
)
export const EmittedApplicationElement = ApplicationComposition.makeElement({
  container: null,
  init: applicationInit,
  update: applicationUpdate,
  view: applicationView,
})
export const ReprovidedServiceApplicationElement =
  PendingServiceApplicationElement.provide(ApplicationClientLayer)
export const providedServiceApplicationHandle = Runtime.embed(
  ProvidedServiceApplicationElement,
)

type EmittedSettingsServicesAreExact = Expect<
  Equal<Layer.Services<typeof SettingsEffectsLayer>, SettingsClient>
>
type EmittedSettingsErrorIsExact = Expect<
  Equal<Layer.Error<typeof SettingsEffectsLayer>, 'SettingsHandlerUnavailable'>
>
type EmittedSettingsInitModelIsExact = Expect<
  Equal<typeof emittedSettingsInit.model, SettingsModel>
>
type EmittedProjectedStatusInitModelIsExact = Expect<
  Equal<typeof emittedProjectedStatusInit.model, ParentModel>
>
type EmittedSettingsUpdateOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<typeof emittedSettingsUpdate>, SettingsOutMessage>
>
type EmittedSettingsUpdateRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof settingsUpdate>,
    Command.HandlerOf<typeof SyncSettings>
  >
>
type EmittedParentInitParametersAreExact = Expect<
  Equal<Parameters<typeof parentInit>, [startup: ParentStartup]>
>
type EmittedParentInitModelIsExact = Expect<
  Equal<typeof emittedParentInit.model, ParentModel>
>
type EmittedParentInitRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof parentInit>,
    Block.Scoped<'settings', Command.HandlerOf<typeof SyncSettings>>
  >
>
type EmittedParentUpdateOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<typeof emittedParentUpdate>, ParentOutMessage>
>
type EmittedSettingsFoldInputsAreExact = Expect<
  Equal<
    Parameters<typeof SettingsBinding.fold>,
    [
      model: ParentModel &
        Update.GraphCapability<
          ParentModel,
          Block.BindingRequirement<'settings', typeof SettingsBlock>
        >,
      message: typeof SettingsMessage.Type,
      CurrentUser,
    ]
  >
>
type EmittedStatusFoldInputsAreExact = Expect<
  Equal<
    Parameters<typeof StatusBinding.fold>,
    [
      model: ParentModel &
        Update.GraphCapability<
          ParentModel,
          Block.BindingRequirement<'status', typeof StatusBlock>
        >,
      message: typeof StatusMessage.Type,
    ]
  >
>
type EmittedRoomFoldInputsAreExact = Expect<
  Equal<
    Parameters<typeof RoomBinding.fold>,
    [
      model: ParentModel &
        Update.GraphCapability<
          ParentModel,
          Block.BindingRequirement<'room', typeof RoomBlock>
        >,
      key: string,
      message: typeof RoomMessage.Type,
      RoomDispatchContext,
    ]
  >
>
type EmittedCompositionInitModelIsExact = Expect<
  Equal<ReturnType<typeof emittedCompositionInit>['model'], ParentModel>
>
type EmittedCompositionUpdateInputsAreExact = Expect<
  Equal<
    Parameters<typeof emittedCompositionUpdate>,
    [model: ParentModel, message: typeof ParentMessage.Type]
  >
>
type EmittedFirstManualDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof FirstManualStatusBinding,
    ReturnType<typeof ParentMessage.GotStatusMessage>,
    never
  >
>
type EmittedSecondManualDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof SecondManualStatusBinding,
    ReturnType<typeof ParentMessage.GotStatusMessage>,
    never
  >
>
type EmittedProjectedStatusDeliveryIsExact = Expect<
  DeliveryIsExact<
    typeof ProjectedStatusBinding,
    ReturnType<typeof ParentMessage.OpenedDashboard>,
    never
  >
>
type EmittedProjectedStatusInitialEvidenceIsExact = Expect<
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
type EmittedApplicationInitModelIsExact = Expect<
  Equal<typeof emittedApplicationInit.model, ApplicationModel>
>
type EmittedApplicationDefaultInitParametersAreExact = Expect<
  Equal<Parameters<typeof applicationDefaultInit>, [count?: number | undefined]>
>
type EmittedApplicationReadonlyRestInitParametersAreExact = Expect<
  Equal<Parameters<typeof applicationReadonlyRestInit>, number[]>
>
type EmittedApplicationUpdateInputsAreExact = Expect<
  Equal<
    Parameters<typeof applicationUpdate>,
    [model: ApplicationModel, message: typeof ApplicationMessage.Type]
  >
>
type EmittedApplicationElementIsExact = Expect<
  Equal<
    typeof ApplicationElement,
    ElementProgram<undefined, never, never, never>
  >
>
type RecompletedApplicationElementIsExact = Expect<
  Equal<
    typeof EmittedApplicationElement,
    ElementProgram<undefined, never, never, never>
  >
>
type EmittedProvidedServiceApplicationElementIsExact = Expect<
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
type ReprovidedServiceApplicationElementIsExact = Expect<
  Equal<
    typeof ReprovidedServiceApplicationElement,
    ElementProgram<
      undefined,
      never,
      never,
      ApplicationClient | Command.HandlerOf<typeof RunApplicationTask>
    >
  >
>

export type EmittedCompositionAuthoringAssertions = [
  EmittedSettingsServicesAreExact,
  EmittedSettingsErrorIsExact,
  EmittedSettingsInitModelIsExact,
  EmittedProjectedStatusInitModelIsExact,
  EmittedSettingsUpdateOutMessageIsExact,
  EmittedSettingsUpdateRequirementsAreExact,
  EmittedParentInitParametersAreExact,
  EmittedParentInitModelIsExact,
  EmittedParentInitRequirementsAreExact,
  EmittedParentUpdateOutMessageIsExact,
  EmittedSettingsFoldInputsAreExact,
  EmittedStatusFoldInputsAreExact,
  EmittedRoomFoldInputsAreExact,
  EmittedCompositionInitModelIsExact,
  EmittedCompositionUpdateInputsAreExact,
  EmittedFirstManualDeliveryIsExact,
  EmittedSecondManualDeliveryIsExact,
  EmittedProjectedStatusDeliveryIsExact,
  EmittedProjectedStatusInitialEvidenceIsExact,
  EmittedApplicationInitModelIsExact,
  EmittedApplicationDefaultInitParametersAreExact,
  EmittedApplicationReadonlyRestInitParametersAreExact,
  EmittedApplicationUpdateInputsAreExact,
  EmittedApplicationElementIsExact,
  RecompletedApplicationElementIsExact,
  EmittedProvidedServiceApplicationElementIsExact,
  ReprovidedServiceApplicationElementIsExact,
]

import {
  NoStartupComposition,
  type NoStartupModel,
} from './composition-authoring.accepted.js'
export const noStartupConsumerInit = NoStartupComposition.makeInit(() => ({
  model: {},
}))
export const noStartupConsumerModel: typeof NoStartupModel.Type =
  noStartupConsumerInit().model
