import { Layer, Option } from 'effect'
import { Block, Runtime, Update } from 'foldkit'

import {
  ApplicationRoute,
  CurrentUser,
  NoStartupComposition,
  type ParentChildInitContext,
  ParentComposition,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  ParentOutMessage,
  PendingServiceApplicationElement,
  ProjectedStatusBinding,
  RoomBinding,
  RoomBlock,
  SettingsBinding,
  SettingsBlock,
  SettingsComposition,
  SettingsMessage,
  SettingsModel,
  SettingsOutMessage,
  StatusBinding,
  StatusBlock,
  StatusModel,
  applicationDefaultInit,
  applicationReadonlyRestInit,
  parentInit,
  parentUpdate,
  settingsInit,
  settingsUpdate,
} from './composition-authoring.accepted.js'

// @ts-expect-error A typed Definition requires Model and Message contracts.
Block.makeDefinition('MissingContracts')

// @ts-expect-error Initializers reject unknown fields instead of silently dropping them.
NoStartupComposition.makeInit(() => ({ model: {}, unexpected: true }))

const unexpectedPlan = { model: {}, unexpected: true }
// @ts-expect-error Predeclared results retain exact plan field validation.
NoStartupComposition.makeInit(() => unexpectedPlan)

// @ts-expect-error Every returned plan variant must use supported fields.
NoStartupComposition.makeInit((isUnexpected: boolean) =>
  isUnexpected ? { model: {}, unexpected: true } : { model: {} },
)

// @ts-expect-error Runtime cannot start an Application with an unprovided ordinary Service.
Runtime.embed(PendingServiceApplicationElement)

// @ts-expect-error A defaulted numeric initializer does not accept a string.
applicationDefaultInit('wrong')

// @ts-expect-error A numeric rest initializer does not accept a string.
applicationReadonlyRestInit('wrong')

ParentComposition.makeUpdate({
  OpenedDashboard: model => ({ model }),
  // @ts-expect-error Routed child Messages are handled by their registered Binding.
  GotStatusMessage: model => ({ model }),
})

const forwardSettingsOutMessage = (
  outMessage: typeof SettingsOutMessage.Type,
) =>
  SettingsOutMessage.match(outMessage, {
    SelectedTheme: ({ theme }) =>
      ParentOutMessage.SelectedSettingsTheme({ theme }),
  })

const rawRefresh = SettingsBinding.refresh(
  CurrentUser.make({ accountId: 'raw-completion' }),
)
const uncompletedRawRefreshUpdate = (
  model: Parameters<typeof rawRefresh>[0],
  _message: typeof ParentMessage.Type,
) => rawRefresh(model)

ParentComposition.prepareBlock({
  init: parentInit,
  // @ts-expect-error A connected recipe must pass through Composition.makeUpdate before Block completion.
  update: uncompletedRawRefreshUpdate,
  EffectsLayer: Layer.empty,
})

// @ts-expect-error The Settings Command handler must be registered.
SettingsComposition.prepareBlock({
  init: settingsInit,
  update: settingsUpdate,
  EffectsLayer: Layer.empty,
})

// @ts-expect-error A direct child with required dispatch context needs a delivery context mapper.
ParentDefinition.makeRequiredFieldBinding(SettingsBlock, {
  field: 'settings',
  placement: 'settingsWithoutContext',
}).withOutMessagePolicy({ forward: forwardSettingsOutMessage })

// @ts-expect-error Generated delivery requires the child's exact CurrentUser context tuple.
ParentDefinition.makeRequiredFieldBinding(SettingsBlock, {
  field: 'settings',
  placement: 'settingsWithoutCompleteContext',
  delivery: { toUpdateContext: () => [] },
}).withOutMessagePolicy({ forward: forwardSettingsOutMessage })

// @ts-expect-error Generated delivery accepts only the child's required CurrentUser context.
ParentDefinition.makeRequiredFieldBinding(SettingsBlock, {
  field: 'settings',
  placement: 'settingsWithExtraContext',
  delivery: {
    toUpdateContext: model => [model.currentUser, model.currentUser],
  },
}).withOutMessagePolicy({ forward: forwardSettingsOutMessage })

// @ts-expect-error A generated general keyed Binding requires an exact key Schema.
ParentDefinition.makeCustomKeyedBinding(RoomBlock, {
  placement: 'roomWithoutKeySchema',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
  delivery: {
    toUpdateContext: (_model: typeof ParentModel.Type, roomId: string) => [
      { roomId },
    ],
  },
})

// @ts-expect-error A keyed child with required dispatch context needs a delivery context mapper.
ParentDefinition.makeCustomKeyedBinding(RoomBlock, {
  placement: 'roomWithoutContext',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  keySchema: RoomBlock.Model.fields.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
})

ParentDefinition.makeCustomKeyedBinding(RoomBlock, {
  placement: 'roomWithWrongKeySchema',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  // @ts-expect-error The decoded key Schema must match the selector's exact key type.
  keySchema: Schema.Number,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
  delivery: { toUpdateContext: (_model, roomId) => [{ roomId }] },
})

ParentDefinition.makeCustomKeyedBinding(RoomBlock, {
  placement: 'roomWithWrongContext',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  keySchema: RoomBlock.Model.fields.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
  delivery: {
    // @ts-expect-error The generated delivery context preserves the exact RoomDispatchContext fields.
    toUpdateContext: (_model, roomId) => [{ sourceRoomId: roomId }],
  },
})

// @ts-expect-error A Binding config must select one supported storage shape.
ParentDefinition.makeRequiredFieldBinding(StatusBlock, {})

// @ts-expect-error A valid Binding config cannot add an unknown field.
ParentDefinition.makeRequiredFieldBinding(StatusBlock, {
  field: 'status',
  unknownConfigField: true,
})

ParentDefinition.makeCustomKeyedBinding(StatusBlock, {
  // @ts-expect-error A direct field Binding cannot also declare general keyed storage.
  field: 'status',
  readAll: model => [model.status],
})

// @ts-expect-error A general keyed Binding requires its complete storage and generated delivery contract.
ParentDefinition.makeCustomKeyedBinding(RoomBlock, {
  readAll: model => Option.toArray(model.maybeRoom),
})

// @ts-expect-error A Binding init policy cannot add an unknown field.
ParentDefinition.makeRequiredFieldBinding(StatusBlock, {
  field: 'status',
  init: { contextToArgs: () => [], unknownInitField: true },
})

// @ts-expect-error Explicit relationship constructors do not accept authored incoming Message routes.
ParentDefinition.makeRequiredFieldBinding(StatusBlock, {
  field: 'status',
  fromParentMessage: false,
})

ParentDefinition.makeCustomBinding(StatusBlock, {
  placement: 'statusWithMultipleProjectionFields',
  read: model => Option.some(model.status),
  write: (model, nextStatus) =>
    ParentModel.make({ ...model, status: nextStatus }),
  init: {
    contextToArgs: () => [],
    // @ts-expect-error An accessor init projection cannot write a second parent field.
    toParentFields: status => ({ status, secondaryStatus: status }),
  },
})

// @ts-expect-error An accessor init projection cannot write an undeclared parent field.
ParentDefinition.makeCustomBinding(StatusBlock, {
  placement: 'statusWithUndeclaredProjectionField',
  read: model => Option.some(model.status),
  write: (model, nextStatus) =>
    ParentModel.make({ ...model, status: nextStatus }),
  init: {
    contextToArgs: () => [],
    toParentFields: status => ({ status, undeclaredStatus: status }),
  },
})

const DuplicateStatusBinding = ParentDefinition.makeRequiredFieldBinding(
  StatusBlock,
  {
    field: 'status',
    placement: 'status',
  },
)

// @ts-expect-error Two generated child channels cannot use the same placement.
ParentDefinition.makeComposition({
  bindings: [StatusBinding, DuplicateStatusBinding],
})

// @ts-expect-error Initialized child Bindings require shared startup input.
ParentComposition.makeInit(() => ({
  model: {
    currentUser: CurrentUser.make({ accountId: 'missing-startup' }),
    route: ApplicationRoute.Dashboard(),
    maybeRoom: Option.none(),
  },
}))

// @ts-expect-error Initialized child fields are assembled by their Bindings.
ParentComposition.makeInit((childInitContext: ParentChildInitContext) => ({
  childInitContext,
  model: {
    settings: SettingsModel.make({ theme: childInitContext.theme }),
    currentUser: childInitContext.currentUser,
    route: childInitContext.route,
    maybeRoom: Option.none(),
  },
}))

// @ts-expect-error Initialization Steps cannot emit an OutMessage.
ParentComposition.makeInit((childInitContext: ParentChildInitContext) => ({
  childInitContext,
  model: {
    currentUser: childInitContext.currentUser,
    route: childInitContext.route,
    maybeRoom: Option.none(),
  },
  steps: [
    (model: typeof ParentModel.Type) => ({
      model,
      outMessage: ParentOutMessage.SelectedSettingsTheme({
        theme: childInitContext.theme,
      }),
    }),
  ],
}))

ParentComposition.makeUpdate({
  OpenedDashboard: (model, message) => {
    // @ts-expect-error Generated child Messages are excluded from authored update input.
    const routed: Readonly<{
      _tag: 'GotSettingsMessage'
    }> = message
    void routed
    return { model }
  },
})

ParentComposition.makeUpdate({
  // @ts-expect-error Parent update cannot emit a child OutMessage.
  OpenedDashboard: model => ({
    model,
    outMessage: SettingsOutMessage.SelectedTheme({
      theme: model.settings.theme,
    }),
  }),
})

const UnregisteredStatusBinding = ParentDefinition.makeRequiredFieldBinding(
  StatusBlock,
  {
    field: 'status',
    placement: 'unregisteredAlternativeStatus',
  },
)
const UnregisteredComposition = ParentDefinition.makeComposition({
  bindings: [
    SettingsBinding,
    UnregisteredStatusBinding,
    ProjectedStatusBinding,
    RoomBinding,
  ],
})
const unregisteredInit = UnregisteredComposition.makeInit(
  // @ts-expect-error Initialization Steps cannot use an unregistered child Binding.
  (childInitContext: ParentChildInitContext) => ({
    model: ParentModel.make({
      settings: SettingsModel.make({ theme: childInitContext.theme }),
      status: StatusModel.make({ count: 0 }),
      secondaryStatus: StatusModel.make({ count: 0 }),
      currentUser: childInitContext.currentUser,
      route: childInitContext.route,
      maybeRoom: Option.none(),
    }),
    steps: [SettingsBinding.refresh(childInitContext.currentUser)],
  }),
)

void unregisteredInit
void parentInit
void parentUpdate

const exactRefreshInit = ParentComposition.makeInit(
  (childInitContext: ParentChildInitContext) => ({
    childInitContext,
    model: {
      currentUser: childInitContext.currentUser,
      route: childInitContext.route,
      maybeRoom: Option.none(),
    },
    steps: [SettingsBinding.refresh(childInitContext.currentUser)],
  }),
)

type RefreshStep = ReturnType<typeof SettingsBinding.refresh>
type DirectRefreshRequirements = Update.RequirementsOf<RefreshStep>
type SettingsRegistration = Block.RequirementOfBinding<typeof SettingsBinding>

const exactRefresh: (
  model: Parameters<RefreshStep>[0],
) => Update.ResultRecipe<
  typeof ParentModel.Type,
  typeof ParentComposition.Message.Type,
  never,
  DirectRefreshRequirements,
  SettingsRegistration
> = SettingsBinding.refresh(CurrentUser.make({ accountId: 'exact-erasure' }))

const changedTheme = ParentDefinition.makeStep(
  () => (model: Parameters<typeof SettingsBinding.fold>[0]) =>
    SettingsBinding.fold(
      model,
      SettingsMessage.ChangedTheme({ theme: 'Contrast' }),
      CurrentUser.make({ accountId: 'emitting-policy' }),
    ),
)
type ChangedThemeStep = typeof changedTheme
type ChangedThemeRequirements = Update.RequirementsOf<ChangedThemeStep>

// @ts-expect-error Init cannot consume a Step whose selected handler forwards an OutMessage.
ParentComposition.makeInit((childInitContext: ParentChildInitContext) => ({
  childInitContext,
  model: {
    currentUser: childInitContext.currentUser,
    route: childInitContext.route,
    maybeRoom: Option.none(),
  },
  steps: [changedTheme],
}))

// @ts-expect-error A recipe cannot erase its selected handler's forwarded OutMessage policy while retaining only direct registration.
const erasedChangedTheme: (
  model: Parameters<ChangedThemeStep>[0],
) => Update.ResultRecipe<
  typeof ParentModel.Type,
  typeof ParentComposition.Message.Type,
  never,
  ChangedThemeRequirements,
  SettingsRegistration
> = changedTheme

const widenedRefresh: (
  model: Parameters<RefreshStep>[0],
) => Update.ResultRecipe<
  typeof ParentModel.Type,
  typeof ParentComposition.Message.Type,
  never,
  DirectRefreshRequirements,
  unknown
> = SettingsBinding.refresh(CurrentUser.make({ accountId: 'unknown-erasure' }))

const combinedWidenedRefresh = Update.combineSteps([
  widenedRefresh,
  ParentDefinition.makeStep(model => ({ model })),
])

const erasedAnyRefresh: (
  model: Parameters<RefreshStep>[0],
) => Update.ResultRecipe<
  typeof ParentModel.Type,
  typeof ParentComposition.Message.Type,
  never,
  DirectRefreshRequirements,
  // oxlint-disable-next-line typescript/no-explicit-any -- This fixture verifies that an erased policy obligation cannot bypass Composition validation.
  any
> = SettingsBinding.refresh(CurrentUser.make({ accountId: 'any-erasure' }))

// @ts-expect-error Init rejects a Step whose policy obligation was widened away.
ParentComposition.makeInit((childInitContext: ParentChildInitContext) => ({
  childInitContext,
  model: {
    currentUser: childInitContext.currentUser,
    route: childInitContext.route,
    maybeRoom: Option.none(),
  },
  steps: [widenedRefresh],
}))

// @ts-expect-error Combining Steps cannot erase their policy obligations.
ParentComposition.makeInit((childInitContext: ParentChildInitContext) => ({
  childInitContext,
  model: {
    currentUser: childInitContext.currentUser,
    route: childInitContext.route,
    maybeRoom: Option.none(),
  },
  steps: [combinedWidenedRefresh],
}))

ParentComposition.makeUpdate({
  // @ts-expect-error Update rejects unknown-erased policy obligations.
  OpenedDashboard: (model, _message) => widenedRefresh(model),
})
ParentComposition.makeUpdate({
  // @ts-expect-error Update rejects any-erased policy obligations.
  OpenedDashboard: (model, _message) => erasedAnyRefresh(model),
})

void exactRefreshInit
void exactRefresh
void erasedChangedTheme

// @ts-expect-error The removed command authoring name has no compatibility alias.
ParentDefinition.command
// @ts-expect-error The removed mount authoring name has no compatibility alias.
ParentDefinition.mount
// @ts-expect-error The removed mountStream authoring name has no compatibility alias.
ParentDefinition.mountStream
// @ts-expect-error The removed resource authoring name has no compatibility alias.
ParentDefinition.resource
// @ts-expect-error The removed subscriptions authoring name has no compatibility alias.
ParentDefinition.subscriptions
// @ts-expect-error The removed managedResources authoring name has no compatibility alias.
ParentDefinition.managedResources
// @ts-expect-error The removed bindChild authoring name has no compatibility alias.
ParentDefinition.bindChild
// @ts-expect-error The removed step authoring name has no compatibility alias.
ParentDefinition.step
// @ts-expect-error The removed stepFields authoring name has no compatibility alias.
ParentDefinition.stepFields
// @ts-expect-error The removed stepNoop authoring name has no compatibility alias.
ParentDefinition.stepNoop

const EarlyNamespace = Block.makeNamespace('RemovedFactoryAliases')
// @ts-expect-error Early Namespaces use the same make family without a command alias.
EarlyNamespace.command
// @ts-expect-error Early Namespaces use the same make family without a mount alias.
EarlyNamespace.mount
// @ts-expect-error Early Namespaces use the same make family without a mountStream alias.
EarlyNamespace.mountStream
// @ts-expect-error Early Namespaces use the same make family without a resource alias.
EarlyNamespace.resource
