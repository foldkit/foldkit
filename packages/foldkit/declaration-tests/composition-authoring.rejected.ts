import { Layer, Option } from 'effect'
import { Runtime } from 'foldkit'

import {
  ApplicationRoute,
  CurrentUser,
  Parent,
  ParentComposition,
  ParentMessage,
  ParentModel,
  ParentOutMessage,
  type ParentStartup,
  PendingServiceApplicationElement,
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

// @ts-expect-error Runtime cannot start an Application with an unprovided ordinary Service.
Runtime.embed(PendingServiceApplicationElement)

// @ts-expect-error A defaulted numeric initializer does not accept a string.
applicationDefaultInit('wrong')

// @ts-expect-error A numeric rest initializer does not accept a string.
applicationReadonlyRestInit('wrong')

ParentComposition.makeUpdate((model, message) =>
  // @ts-expect-error Composition routes the registered child Message.
  ParentMessage.match(message, {
    OpenedDashboard: () => ({ model }),
    GotStatusMessage: () => ({ model }),
  }),
)

const forwardSettingsOutMessage = (
  outMessage: typeof SettingsOutMessage.Type,
) =>
  SettingsOutMessage.match(outMessage, {
    SelectedTheme: ({ theme }) =>
      ParentOutMessage.SelectedSettingsTheme({ theme }),
  })

SettingsComposition.makeBlock({
  init: settingsInit,
  update: settingsUpdate,
  // @ts-expect-error The Settings Command handler must be registered.
  EffectsLayer: Layer.empty,
})

// @ts-expect-error A direct child with required dispatch context needs a route resolver.
// oxfmt-ignore
Parent.bindChild(SettingsBlock, { field: 'settings', placement: 'settingsWithoutContext', parentMessage: ParentMessage.GotSettingsMessage, outMessage: { forward: forwardSettingsOutMessage } })

// @ts-expect-error The native fold tuple includes the required CurrentUser.
// oxfmt-ignore
Parent.bindChild(SettingsBlock, { field: 'settings', placement: 'settingsWithoutCompleteContext', parentMessage: ParentMessage.GotSettingsMessage, fromParentMessage: { args: (_model, { message }) => Option.some([message]) }, outMessage: { forward: forwardSettingsOutMessage } })

// @ts-expect-error The native fold tuple preserves Message and context order.
// oxfmt-ignore
Parent.bindChild(SettingsBlock, { field: 'settings', placement: 'settingsWithReversedContext', parentMessage: ParentMessage.GotSettingsMessage, fromParentMessage: { args: (model, { message }) => Option.some([model.currentUser, message]) }, outMessage: { forward: forwardSettingsOutMessage } })

Parent.bindChild(RoomBlock, {
  placement: 'roomWithoutRoute',
  readAll: model => Option.toArray(model.maybeRoom),
  // @ts-expect-error Keyed Bindings require an explicit parent Message route.
  key: room => room.id,
  // @ts-expect-error The invalid Binding config is uninhabitable.
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
  toParentMessage: (roomId, message) =>
    ParentMessage.GotRoomMessage({ roomId, message }),
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithoutCompleteContext',
  readAll: model => Option.toArray(model.maybeRoom),
  key: room => room.id,
  read: room => room,
  writeAt: (model, _roomId, nextRoom) =>
    ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) }),
  toParentMessage: (roomId, message) =>
    ParentMessage.GotRoomMessage({ roomId, message }),
  // @ts-expect-error A keyed native fold tuple includes key, Message, and dispatch context.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { roomId, message }) => Option.some([roomId, message]),
  },
})

const readRooms = (model: typeof ParentModel.Type) =>
  Option.toArray(model.maybeRoom)
const readRoomKey = (room: typeof RoomBlock.Model.Type) => room.id
const readRoom = (room: typeof RoomBlock.Model.Type) => room
const writeRoom = (
  model: typeof ParentModel.Type,
  _roomId: string,
  nextRoom: typeof RoomBlock.Model.Type,
) => ParentModel.make({ ...model, maybeRoom: Option.some(nextRoom) })
const toParentRoomMessage = (
  roomId: string,
  message: typeof RoomBlock.Message.Type,
) => ParentMessage.GotRoomMessage({ roomId, message })

Parent.bindChild(RoomBlock, {
  placement: 'roomWithWrongRouteKey',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route preserves the string occurrence key.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { message, roomId }) =>
      Option.some([1, message, { roomId }]),
  },
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithWrongRouteMessage',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route requires the child Message union.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { roomId }) =>
      Option.some([roomId, SettingsMessage.RequestedSync(), { roomId }]),
  },
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithWrongRouteMessagePayload',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route preserves refined child Message payloads.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { roomId }) =>
      Option.some([roomId, { _tag: 'RenamedRoom', name: 1 }, { roomId }]),
  },
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithWrongRouteContext',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route preserves the required context fields.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { message, roomId }) =>
      Option.some([roomId, message, { sourceRoomId: roomId }]),
  },
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithReorderedRoute',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route preserves key, Message, and context order.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { message, roomId }) =>
      Option.some([message, roomId, { roomId }]),
  },
})

Parent.bindChild(RoomBlock, {
  placement: 'roomWithExtraRouteArgument',
  readAll: readRooms,
  key: readRoomKey,
  read: readRoom,
  writeAt: writeRoom,
  toParentMessage: toParentRoomMessage,
  // @ts-expect-error A keyed native fold route rejects extra arguments.
  fromParentMessage: {
    parentMessage: ParentMessage.GotRoomMessage,
    args: (_model, { message, roomId }) =>
      Option.some([roomId, message, { roomId }, 'extra']),
  },
})

// @ts-expect-error A Binding config must select one supported storage shape.
Parent.bindChild(StatusBlock, {})

// @ts-expect-error A valid Binding config cannot add an unknown field.
Parent.bindChild(StatusBlock, {
  field: 'status',
  parentMessage: ParentMessage.GotStatusMessage,
  unknownConfigField: true,
})

Parent.bindChild(StatusBlock, {
  // @ts-expect-error A direct field Binding cannot also declare general keyed storage.
  field: 'status',
  readAll: model => [model.status],
  // @ts-expect-error The invalid Binding config is uninhabitable.
  parentMessage: ParentMessage.GotStatusMessage,
})

// @ts-expect-error A general keyed Binding requires its complete storage and Message mapping.
Parent.bindChild(RoomBlock, {
  readAll: model => Option.toArray(model.maybeRoom),
})

Parent.bindChild(StatusBlock, {
  // @ts-expect-error A Binding init policy cannot add an unknown field.
  field: 'status',
  // @ts-expect-error The invalid Binding config is uninhabitable.
  parentMessage: ParentMessage.GotStatusMessage,
  // @ts-expect-error The invalid Binding config is uninhabitable.
  init: { args: () => [], unknownInitField: true },
})

Parent.bindChild(StatusBlock, {
  // @ts-expect-error A fromParentMessage policy cannot add an unknown field.
  field: 'status',
  // @ts-expect-error The invalid Binding config is uninhabitable.
  parentMessage: ParentMessage.GotStatusMessage,
  // @ts-expect-error The invalid Binding config is uninhabitable.
  fromParentMessage: {
    args: (_model, { message }) => Option.some([message]),
    unknownRouteField: true,
  },
})

Parent.bindChild(StatusBlock, {
  // @ts-expect-error An accessor init projection contributes exactly one parent Model field.
  placement: 'statusWithMultipleProjectionFields',
  // @ts-expect-error The invalid Binding config is uninhabitable.
  read: model => Option.some(model.status),
  // @ts-expect-error The invalid Binding config is uninhabitable.
  write: (model, nextStatus) =>
    ParentModel.make({ ...model, status: nextStatus }),
  // @ts-expect-error The invalid Binding config is uninhabitable.
  parentMessage: ParentMessage.GotStatusMessage,
  // @ts-expect-error The invalid Binding config is uninhabitable.
  init: {
    args: () => [],
    model: status => ({ status, secondaryStatus: status }),
  },
})

Parent.bindChild(StatusBlock, {
  // @ts-expect-error An accessor init projection cannot contribute an undeclared field.
  placement: 'statusWithUndeclaredProjectionField',
  // @ts-expect-error The invalid Binding config is uninhabitable.
  read: model => Option.some(model.status),
  // @ts-expect-error The invalid Binding config is uninhabitable.
  write: (model, nextStatus) =>
    ParentModel.make({ ...model, status: nextStatus }),
  // @ts-expect-error The invalid Binding config is uninhabitable.
  parentMessage: ParentMessage.GotStatusMessage,
  // @ts-expect-error The invalid Binding config is uninhabitable.
  init: {
    args: () => [],
    model: status => ({ status, undeclaredStatus: status }),
  },
})

const DuplicateStatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  placement: 'duplicateStatus',
  parentMessage: ParentMessage.GotStatusMessage,
})

// @ts-expect-error One parent Message variant cannot route to two Bindings.
Parent.makeComposition({
  childBindings: [StatusBinding, DuplicateStatusBinding],
})

const ExactOutgoingStatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  placement: 'exactOutgoingStatus',
  toParentMessage: message => ParentMessage.GotStatusMessage({ message }),
  fromParentMessage: false,
})

// @ts-expect-error A Binding output cannot overlap another Binding's incoming route.
Parent.makeComposition({
  childBindings: [StatusBinding, ExactOutgoingStatusBinding],
})

const toWidenedParentMessage = (
  message: typeof StatusBlock.Message.Type,
): typeof ParentMessage.Type => ParentMessage.GotStatusMessage({ message })

const WidenedOutgoingStatusBinding = Parent.bindChild(StatusBlock, {
  field: 'status',
  placement: 'widenedOutgoingStatus',
  toParentMessage: toWidenedParentMessage,
  fromParentMessage: false,
})

// @ts-expect-error A widened custom mapper cannot hide overlap with an incoming route.
Parent.makeComposition({
  childBindings: [StatusBinding, WidenedOutgoingStatusBinding],
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
ParentComposition.makeInit((startup: ParentStartup) => ({
  startup,
  model: {
    settings: SettingsModel.make({ theme: startup.theme }),
    currentUser: startup.currentUser,
    route: startup.route,
    maybeRoom: Option.none(),
  },
}))

// @ts-expect-error Initialization Steps cannot emit an OutMessage.
ParentComposition.makeInit((startup: ParentStartup) => ({
  startup,
  model: {
    currentUser: startup.currentUser,
    route: startup.route,
    maybeRoom: Option.none(),
  },
  steps: [
    (model: typeof ParentModel.Type) => ({
      model,
      outMessage: ParentOutMessage.SelectedSettingsTheme({
        theme: startup.theme,
      }),
    }),
  ],
}))

ParentComposition.makeUpdate((model, message) => {
  // @ts-expect-error Routed child wrapper Messages are excluded from authored update input.
  const routed: ReturnType<typeof ParentMessage.GotSettingsMessage> = message
  void routed

  return { model }
})

ParentComposition.makeUpdate(model => ({
  model,
  // @ts-expect-error Parent update cannot emit a child OutMessage.
  outMessage: SettingsOutMessage.SelectedTheme({ theme: model.settings.theme }),
}))

const UnregisteredComposition = Parent.makeComposition()
const unregisteredInit = UnregisteredComposition.makeInit(
  // @ts-expect-error Initialization Steps cannot use an unregistered child Binding.
  (startup: ParentStartup) => ({
    model: ParentModel.make({
      settings: SettingsModel.make({ theme: startup.theme }),
      status: StatusModel.make({ count: 0 }),
      secondaryStatus: StatusModel.make({ count: 0 }),
      currentUser: startup.currentUser,
      route: startup.route,
      maybeRoom: Option.none(),
    }),
    steps: [SettingsBinding.refresh(startup.currentUser)],
  }),
)

void unregisteredInit
void parentInit
void parentUpdate
