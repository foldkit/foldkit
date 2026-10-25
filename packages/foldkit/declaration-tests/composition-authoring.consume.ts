import { Layer, Option, Schema } from 'effect'
import { Program, Runtime, Struct } from 'foldkit'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import type { Element as ElementProgram } from 'foldkit/program'
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
  FirstStatusBinding,
  type ParentChildInitContext,
  ParentComposition,
  ParentMessage,
  type ParentModel,
  type ParentOutMessage,
  ParentRefreshBlock,
  PendingServiceApplicationElement,
  ProjectedStatusBinding,
  ProvidedServiceApplicationElement,
  RoomBinding,
  type RoomDispatchContext,
  RoomMessage,
  RunApplicationTask,
  SecondStatusBinding,
  SettingsBinding,
  SettingsClient,
  SettingsEffectsLayer,
  SettingsMessage,
  type SettingsModel,
  type SettingsOutMessage,
  StatusBinding,
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
  parentInit,
  parentRefreshUpdate,
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

type GeneratedMessageOf<Value> =
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture rejects erased generated delivery channels below.
  Value extends Block.BindingDeliveryEvidence<any, any, infer MessageSchema>
    ? MessageSchema extends Schema.Top
      ? MessageSchema['Type']
      : never
    : never

const currentUser = CurrentUser.make({ accountId: 'emitted-user' })
const childInitContext: ParentChildInitContext = {
  theme: 'Dark',
  currentUser,
  route: ApplicationRoute.Room({ roomId: 'room-1' }),
}

export const emittedSettingsInit = settingsInit('Light')
export const emittedParentInit = parentInit(childInitContext)
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
export const emittedParentUpdate = parentUpdate(emittedParentInit.model, {
  _tag: 'GotSettingsMessage',
  placement: 'settings',
  generation: 0,
  message: SettingsMessage.ChangedTheme({ theme: 'Light' }),
})
export const emittedParentRefreshUpdate = parentRefreshUpdate(
  emittedParentInit.model,
  ParentMessage.OpenedDashboard(),
)
export const emittedExposedRefresh =
  ParentRefreshBlock.operations.refreshSettings(emittedParentInit.model)
export const emittedDefaultRouteUpdate = parentUpdate(emittedParentInit.model, {
  _tag: 'GotStatusMessage',
  placement: 'status',
  generation: 0,
  message: StatusMessage.Incremented(),
})
export const emittedKeyedRouteUpdate = parentUpdate(emittedParentInit.model, {
  _tag: 'GotRoomMessage',
  placement: 'room',
  generation: 0,
  key: 'room-1',
  message: RoomMessage.RenamedRoom({ name: 'Main room' }),
})

export const emittedCompositionInit = ParentComposition.makeInit(
  (nextChildInitContext: ParentChildInitContext) => ({
    childInitContext: nextChildInitContext,
    model: {
      currentUser: nextChildInitContext.currentUser,
      route: nextChildInitContext.route,
      maybeRoom: Option.none(),
    },
    steps: [StatusBinding.increment()],
  }),
)

export const emittedCompositionUpdate = ParentComposition.makeUpdate({
  OpenedDashboard: (model, message) => {
    const exactMessage: ReturnType<typeof ParentMessage.OpenedDashboard> =
      message
    void exactMessage
    return { model }
  },
})

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
export const emittedAutomaticStatusUpdate = parentUpdate(
  emittedParentInit.model,
  {
    _tag: 'GotStatusMessage',
    placement: 'status',
    generation: 0,
    message: StatusMessage.Incremented(),
  },
)

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

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init: applicationInit,
    update: applicationUpdate,
    view: applicationView,
  })
const completedBlock: Block.FromAssemblyWithView<
  typeof ApplicationComposition.Model,
  typeof prepare
> = Block.assemble(prepare)
export const EmittedApplicationElement = Program.makeElement({
  block: completedBlock,
  container: null,
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
  Equal<
    Parameters<typeof parentInit>,
    [childInitContext: ParentChildInitContext]
  >
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
type EmittedParentRefreshRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof parentRefreshUpdate>,
    Block.Scoped<'settings', Command.HandlerOf<typeof SyncSettings>>
  >
>
type EmittedParentRefreshMessageIsExact = Expect<
  Equal<
    ReturnCommandMessage<typeof emittedParentRefreshUpdate>,
    typeof ParentComposition.Message.Type
  >
>
type EmittedParentRefreshOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<typeof emittedParentRefreshUpdate>, ParentOutMessage>
>
type EmittedExposedRefreshOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<typeof emittedExposedRefresh>, never>
>
type EmittedSettingsFoldInputsAreExact = Expect<
  Equal<
    Parameters<typeof SettingsBinding.fold>,
    [
      model: ParentModel &
        Update.GraphCapability<
          ParentModel,
          Block.RequirementOfBinding<typeof SettingsBinding>
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
          Block.RequirementOfBinding<typeof StatusBinding>
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
          Block.RequirementOfBinding<typeof RoomBinding>
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
    [model: ParentModel, message: typeof ParentComposition.Message.Type]
  >
>
type EmittedFirstStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof FirstStatusBinding>,
    Readonly<{
      _tag: 'GotFirstStatusMessage'
      placement: 'firstStatus'
      generation: number
      message: typeof StatusMessage.Type
    }>
  >
>
type EmittedSecondStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof SecondStatusBinding>,
    Readonly<{
      _tag: 'GotSecondStatusMessage'
      placement: 'secondStatus'
      generation: number
      message: typeof StatusMessage.Type
    }>
  >
>
type EmittedProjectedStatusDeliveryIsExact = Expect<
  ExactWithoutAnyOrUnknown<
    GeneratedMessageOf<typeof ProjectedStatusBinding>,
    Readonly<{
      _tag: 'GotSecondaryStatusMessage'
      placement: 'secondaryStatus'
      generation: number
      message: typeof StatusMessage.Type
    }>
  >
>
type EmittedProjectedStatusInitialEvidenceIsExact = Expect<
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
  EmittedParentRefreshRequirementsAreExact,
  EmittedParentRefreshMessageIsExact,
  EmittedParentRefreshOutMessageIsExact,
  EmittedExposedRefreshOutMessageIsExact,
  EmittedSettingsFoldInputsAreExact,
  EmittedStatusFoldInputsAreExact,
  EmittedRoomFoldInputsAreExact,
  EmittedCompositionInitModelIsExact,
  EmittedCompositionUpdateInputsAreExact,
  EmittedFirstStatusDeliveryIsExact,
  EmittedSecondStatusDeliveryIsExact,
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
