import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import * as Command from '../command/index.js'
import { block as renderBlock } from '../html/block.js'
import { beginRender, createBoundaryRegistry } from '../html/boundary.js'
import {
  type BoundBlockConfig,
  type HtmlBuilder,
  __htmlBuilder,
} from '../html/index.js'
import { clearRuntime, setRuntime } from '../html/runtimeSingleton.js'
import type * as ManagedResource from '../managedResource/index.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { define as defineApplication } from '../runtime/applicationPublic.js'
import { Dispatch } from '../runtime/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { bind, inspectBinding } from './binding.js'
import { defaultViewOf } from './defaultView.js'
import { type Authoring, define } from './define.js'
import { LocalEffectsLayerTypeId } from './definition.js'
import { lowerBlock } from './lowering.js'
import type { OwnedName } from './ownerName.js'
import type { Implementation } from './public.js'
import type {
  OperationRequirementsOfBlock,
  RequirementsOfBlock,
} from './requirements.js'
import { type Scoped, qualifyLayer } from './scope.js'

const HomeOwner = define('AuthoringHome')

const HomeModel = Schema.Struct({
  status: Schema.Literals(['Idle', 'Creating']),
  joinedCount: Schema.Number,
})
type HomeModel = typeof HomeModel.Type

const HomeMessage = defineMessageUnion({
  ClickedCreateRoom: {},
  CompletedCreateRoom: { roomId: Schema.String },
})
type HomeMessage = typeof HomeMessage.Type

const HomeOutMessage = defineMessageUnion({
  CreatedRoom: { roomId: Schema.String },
})
type HomeOutMessage = typeof HomeOutMessage.Type

let createRoomHandlerBuilds = 0

const CreateRoom = HomeOwner.command('CreateRoom', {
  messages: [HomeMessage.CompletedCreateRoom],
  handler: function* () {
    createRoomHandlerBuilds += 1
    return () =>
      Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'room-1' }))
  },
})

const SaveRoom = HomeOwner.command('SaveRoom', {
  args: { roomId: Schema.String, revision: Schema.Number },
  messages: [HomeMessage.CompletedCreateRoom],
  interrupt: {
    keyFields: ['roomId'],
    toKey: ({ roomId }) => roomId,
  },
  handler: function* () {
    return ({ roomId }) =>
      Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId }))
  },
})

const home = HomeOwner.define({
  Model: HomeModel,
  Message: HomeMessage,
  OutMessage: HomeOutMessage,
})

const ObserveRooms = HomeOwner.mountStream('ObserveRooms', {
  args: { roomId: Schema.String },
  messages: [HomeMessage.CompletedCreateRoom],
  handler: function* () {
    return ({ roomId }) =>
      Stream.succeed(HomeMessage.CompletedCreateRoom({ roomId }))
  },
})

const SelectedRoom = HomeOwner.resource<string>()('SelectedRoom')

const homeSubscriptions = home.subscriptions(entry => ({
  rooms: entry(
    'Rooms',
    { joinedCount: Schema.Number },
    {
      messages: [HomeMessage.CompletedCreateRoom],
      modelToDependencies: model => ({ joinedCount: model.joinedCount }),
      handler: function* () {
        return ({ joinedCount }) =>
          Stream.succeed(
            HomeMessage.CompletedCreateRoom({
              roomId: globalThis.String(joinedCount),
            }),
          )
      },
    },
  ),
}))

const homeManagedResources = home.managedResources(entry => ({
  selectedRoom: entry('SelectedRoom', Schema.Option(Schema.Null), {
    resource: SelectedRoom,
    modelToMaybeRequirements: model =>
      model.status === 'Creating' ? Option.some(null) : Option.none(),
    onAcquired: roomId => HomeMessage.CompletedCreateRoom({ roomId }),
    onReleased: () => HomeMessage.CompletedCreateRoom({ roomId: 'released' }),
    onAcquireError: () => HomeMessage.CompletedCreateRoom({ roomId: 'failed' }),
    handler: function* () {
      return {
        acquire: () => Effect.succeed('room-1'),
        release: () => Effect.void,
      }
    },
  }),
}))

const HomeComposition = home.makeComposition()

const homeView = HomeComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(HomeMessage.ClickedCreateRoom())],
    [`${model.status}:${model.joinedCount}`],
  ),
)

type HomeViewInputs = Readonly<{ label: string }>

let renderedHomeLabel = ''

const homeViewWithDefaultInputs =
  HomeComposition.makeView.withInputs<HomeViewInputs>(
    (_model, { label } = { label: 'Default' }, _h) => {
      renderedHomeLabel = label
      return null
    },
  )

const homeRestTupleView = HomeComposition.makeView.withInputs<HomeViewInputs>(
  (
    ...[_model, { label }, h]: [
      HomeModel,
      HomeViewInputs,
      HtmlBuilder<HomeMessage>,
    ]
  ) => h.div([], [label]),
)

const homeOptionalInputsView = HomeComposition.makeView.withInputs<
  HomeViewInputs | undefined
>((_model, inputs, h) => h.div([], [inputs?.label ?? 'Missing']))

let homeInitCalls = 0

const homeInit = HomeComposition.makeInit(() => {
  homeInitCalls += 1
  return {
    model: HomeModel.make({ status: 'Idle', joinedCount: 0 }),
  }
})

const parameterizedHomeInit = HomeComposition.makeInit(
  (joinedCount = 0, ...suffixes: ReadonlyArray<string>) => ({
    model: HomeModel.make({
      status: 'Idle',
      joinedCount: joinedCount + suffixes.length,
    }),
  }),
)
expect(parameterizedHomeInit().model.joinedCount).toBe(0)
expect(parameterizedHomeInit(2, 'suffix').model.joinedCount).toBe(3)
if (false) {
  // @ts-expect-error The wrapped init preserves its source parameters.
  parameterizedHomeInit('two')
}

const homeUpdate = HomeComposition.makeUpdate((model, message) =>
  HomeMessage.match(message, {
    ClickedCreateRoom: () => ({
      model: modifyFields(model, { status: () => 'Creating' }),
      commands: [CreateRoom()],
    }),
    CompletedCreateRoom: ({ roomId }) => ({
      model: modifyFields(model, { status: () => 'Idle' }),
      outMessage: HomeOutMessage.CreatedRoom({ roomId }),
    }),
  }),
)

const homeBoot = home.step(model => ({
  model,
  commands: [CreateRoom()],
}))

const homeInformJoined = home.step((model, joinedCount: number) => ({
  model: modifyFields(model, { joinedCount: () => joinedCount }),
}))

const Home = HomeComposition.makeBlock({
  view: homeView,
  init: homeInit,
  update: homeUpdate,
  expose: {
    boot: homeBoot,
    informJoined: homeInformJoined,
  },
  EffectsLayer: CreateRoom.layer,
})

const NoMessageOwner = define('AuthoringNoMessage')
const noMessage = NoMessageOwner.define({
  Model: Schema.Null,
  Message: Schema.Never,
})
const NoMessageComposition = noMessage.makeComposition()
const noMessageUpdate = NoMessageComposition.makeUpdate()
const NoMessage = NoMessageComposition.makeBlock({
  init: () => ({ model: null }),
  update: noMessageUpdate,
  view: NoMessageComposition.makeView((_model, h) => ({
    title: 'No Messages',
    body: h.empty,
  })),
})

type GenericAuthoringViewInputs<Item, Value> = Readonly<{
  itemToValue: [Item] extends [Value]
    ? ((item: Item) => Value) | undefined
    : (item: Item) => Value
}>

const makeGenericAuthoring = <const Id extends string, Item, Value>(id: Id) => {
  const GenericOwner = define(id)
  const GenericModel = Schema.Struct({ value: Schema.String })
  type GenericModel = typeof GenericModel.Type
  const GenericMessage = defineMessageUnion({
    RequestedText: { value: Schema.String },
    RequestedCount: { value: Schema.Number },
    CompletedGeneric: {},
  })
  type GenericMessage = typeof GenericMessage.Type

  const RequestText = GenericOwner.command('RequestText', {
    args: { value: Schema.String },
    messages: [GenericMessage.CompletedGeneric],
    handler: function* () {
      return () => Effect.succeed(GenericMessage.CompletedGeneric())
    },
  })
  const RequestCount = GenericOwner.command('RequestCount', {
    args: { value: Schema.Number },
    messages: [GenericMessage.CompletedGeneric],
    handler: function* () {
      return () => Effect.succeed(GenericMessage.CompletedGeneric())
    },
  })
  const definition = GenericOwner.define({
    Model: GenericModel,
    Message: GenericMessage,
  })
  const composition = definition.makeComposition()
  const view = composition.makeView.withInputs<
    GenericAuthoringViewInputs<Item, Value>
  >((model, _viewInputs, h) => h.div([], [model.value]))

  return composition.makeBlock({
    view,
    init: () => ({ model: GenericModel.make({ value: '' }) }),
    update: composition.makeUpdate((model, message) =>
      GenericMessage.match(message, {
        RequestedText: ({ value }) => ({
          model,
          commands: [RequestText({ value })],
        }),
        RequestedCount: ({ value }) => ({
          model,
          commands: [RequestCount({ value })],
        }),
        CompletedGeneric: () => ({ model }),
      }),
    ),
    EffectsLayer: Layer.merge(RequestText.layer, RequestCount.layer),
  })
}

void makeGenericAuthoring

class SelectedRoomsClient extends Context.Service<
  SelectedRoomsClient,
  Readonly<{ roomId: string }>
>()('AuthoringSelectedRoomsClient') {}

const CreateRoomTestLayer = CreateRoom.toLayer(
  Effect.succeed(() =>
    Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'test-room' })),
  ),
)

const CreateRoomSelectedClientLayer = CreateRoom.toLayer(
  Effect.gen(function* () {
    const client = yield* SelectedRoomsClient
    return () =>
      Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: client.roomId }))
  }),
)

const CreateRoomFailedBuildLayer = CreateRoom.toLayer<
  never,
  'ProviderUnavailable'
>(Effect.fail<'ProviderUnavailable'>('ProviderUnavailable'))

const HomeWithTestProvider = Home.replaceEffectsLayer(CreateRoomTestLayer)
const HomeWithSelectedClient = Home.replaceEffectsLayer(
  CreateRoomSelectedClientLayer,
)
const HomeWithFailedBuild = Home.replaceEffectsLayer(CreateRoomFailedBuildLayer)

const homeImplementation = {
  init: homeInit,
  update: homeUpdate,
  EffectsLayer: CreateRoomTestLayer,
} satisfies Implementation<HomeModel, HomeMessage, HomeOutMessage>
const HomeWithCheckedImplementation = home
  .makeComposition()
  .makeBlock(homeImplementation)

const RoomOwner = define('AuthoringRoom')

const RoomModel = Schema.Struct({
  roomId: Schema.String,
  joinedCount: Schema.Number,
})
type RoomModel = typeof RoomModel.Type

const RoomMessage = defineMessageUnion({
  ClickedRefreshRoom: {},
  CompletedLoadRoom: {},
})
type RoomMessage = typeof RoomMessage.Type

const LoadRoom = RoomOwner.command('LoadRoom', {
  args: { roomId: Schema.String },
  messages: [RoomMessage.CompletedLoadRoom],
})

const room = RoomOwner.define({
  Model: RoomModel,
  Message: RoomMessage,
})

const RoomComposition = room.makeComposition()
const roomUpdate = RoomComposition.makeUpdate(
  (model, message, source: 'Reconnect' | 'Route', retryCount?: number) =>
    RoomMessage.match(message, {
      ClickedRefreshRoom: () => ({
        model,
        commands: [LoadRoom({ roomId: model.roomId })],
      }),
      CompletedLoadRoom: () => ({
        model: modifyFields(model, {
          joinedCount: joinedCount =>
            joinedCount + (source === 'Reconnect' ? (retryCount ?? 1) : 1),
        }),
      }),
    }),
)

const roomInformJoined = room.step(
  (model, joinedCount: number, source?: 'Lobby' | 'Game') => ({
    model: modifyFields(model, {
      joinedCount: () => joinedCount + (source === 'Game' ? 1 : 0),
    }),
  }),
)

const Room = RoomComposition.makeBlock({
  init: (roomId: string) => ({
    model: RoomModel.make({ roomId, joinedCount: 0 }),
  }),
  update: roomUpdate,
  expose: { informJoined: roomInformJoined },
  hostHandlers: [LoadRoom],
})

const RoomWithHostProvider = Room.provideHandlers(
  LoadRoom.toLayer(
    Effect.succeed(() => Effect.succeed(RoomMessage.CompletedLoadRoom())),
  ),
)

const ChoiceOwner = define('AuthoringChoice')

const CompletedObserveChoice = Schema.TaggedStruct('CompletedObserveChoice', {})

const ObserveChoice = ChoiceOwner.mount('ObserveChoice', {
  messages: [CompletedObserveChoice],
})

const ChoiceEffectsLayer = Layer.empty

const makeChoice = <Value extends string>(Value: Schema.Schema<Value>) => {
  const Model = Schema.Struct({ value: Value })
  type Model = typeof Model.Type
  const SelectedChoice = Schema.TaggedStruct('SelectedChoice', { value: Value })
  const Message = Schema.Union([SelectedChoice, CompletedObserveChoice])
  type Message = typeof Message.Type
  const OutMessage = Schema.TaggedStruct('SelectedChoice', { value: Value })

  const base = ChoiceOwner.define({
    Model,
    Message,
    OutMessage,
  })
  const composition = base.makeComposition({ mounts: [ObserveChoice] })

  const view = composition.makeView.withInputs<Readonly<{ label: string }>>(
    (model, { label }, h) =>
      h.button(
        [
          h.OnMount(ObserveChoice()),
          h.OnClick(SelectedChoice.make({ value: model.value })),
        ],
        [label],
      ),
  )

  const update = composition.makeUpdate((model, message) => {
    if (message._tag === 'SelectedChoice') {
      return {
        model: Model.make({ value: message.value }),
        outMessage: OutMessage.make({ value: message.value }),
      }
    } else {
      return { model }
    }
  })

  const finish = base.step((_model, value: Value) => ({
    model: Model.make({ value }),
    outMessage: OutMessage.make({ value }),
  }))

  return composition.makeBlock({
    view,
    init: (value: Value) => ({ model: Model.make({ value }) }),
    update,
    expose: { finish },
    EffectsLayer: ChoiceEffectsLayer,
    hostHandlers: [ObserveChoice],
  })
}

const StringChoice = makeChoice(Schema.Literals(['One', 'Two']))

const LeafModel = Schema.Struct({ value: Schema.String })
type LeafModel = typeof LeafModel.Type

const LeafMessage = defineMessageUnion({
  UpdatedLeaf: { value: Schema.String },
})
type LeafMessage = typeof LeafMessage.Type

const makeLeaf = <const Namespace extends string>(
  LeafOwner: Authoring<Namespace>,
  EffectsLayer: Layer.Layer<never, never, never>,
) => {
  const definition = LeafOwner.define({
    Model: LeafModel,
    Message: LeafMessage,
  })

  return definition.makeComposition().makeBlock({
    init: () => ({ model: LeafModel.make({ value: '' }) }),
    update: (model, _message) => ({ model }),
    EffectsLayer,
  })
}

const LeafParentModel = Schema.Struct({ leaf: LeafModel })
type LeafParentModel = typeof LeafParentModel.Type

const bindLeaf = <
  const Definition extends ReturnType<typeof makeLeaf<any>>,
  const Placement extends string,
>(
  definition: Definition,
  placement: Placement,
) =>
  bind(definition, {
    placement,
    read: (model: LeafParentModel) => Option.some(model.leaf),
    write: (model, leaf) => ({ ...model, leaf }),
    toParentMessage: (message: LeafMessage) => message,
  })

const GraphChildOwner = define('AuthoringGraphChild')

const GraphChildModel = Schema.Struct({ count: Schema.Number })
type GraphChildModel = typeof GraphChildModel.Type

const GraphChildMessage = defineMessageUnion({
  RequestedChildWork: {},
  CompletedChildWork: {},
})
type GraphChildMessage = typeof GraphChildMessage.Type

const RunChildWork = GraphChildOwner.command('RunChildWork', {
  messages: [GraphChildMessage.CompletedChildWork],
  handler: function* () {
    return () => Effect.succeed(GraphChildMessage.CompletedChildWork())
  },
})

const GraphChild = GraphChildOwner.define({
  Model: GraphChildModel,
  Message: GraphChildMessage,
})

const graphChildComposition = GraphChild.makeComposition()
const graphChildImplementation = {
  init: () => ({ model: GraphChildModel.make({ count: 0 }) }),
  update: graphChildComposition.makeUpdate((model, message) =>
    GraphChildMessage.match(message, {
      RequestedChildWork: () => ({ model, commands: [RunChildWork()] }),
      CompletedChildWork: () => ({ model }),
    }),
  ),
  EffectsLayer: RunChildWork.layer,
}

const GraphChildBlock = graphChildComposition.makeBlock(
  graphChildImplementation,
)

const GraphParentOwner = define('AuthoringGraphParent')

const GraphParentModel = Schema.Struct({ child: GraphChildModel })
type GraphParentModel = typeof GraphParentModel.Type

const GraphParentMessage = defineMessageUnion({
  GotChildMessage: { message: GraphChildMessage },
  RequestedParentWork: {},
  CompletedParentWork: {},
})
type GraphParentMessage = typeof GraphParentMessage.Type

const RunParentWork = GraphParentOwner.command('RunParentWork', {
  messages: [GraphParentMessage.CompletedParentWork],
})

const graphParentBase = GraphParentOwner.define({
  Model: GraphParentModel,
  Message: GraphParentMessage,
})
const GraphChildBinding = graphParentBase.bindChild(GraphChildBlock, {
  placement: 'child',
  read: (model: GraphParentModel) => Option.some(model.child),
  write: (model, child) => ({ ...model, child }),
  parentMessage: GraphParentMessage.GotChildMessage,
})

const graphParentComposition = graphParentBase.makeComposition({
  childBindings: [GraphChildBinding],
})

const graphParentImplementation = {
  init: () => ({
    model: GraphParentModel.make({
      child: GraphChildModel.make({ count: 0 }),
    }),
  }),
  update: (model: GraphParentModel, _message: GraphParentMessage) => ({
    model,
  }),
  EffectsLayer: Layer.empty,
}

const GraphParent = graphParentComposition.makeBlock(graphParentImplementation)

const SelectedGraphChild = GraphChildBlock.replaceEffectsLayer(
  RunChildWork.toLayer<never, 'ChildProviderUnavailable', SelectedRoomsClient>(
    Effect.gen(function* () {
      yield* SelectedRoomsClient
      return yield* Effect.fail<'ChildProviderUnavailable'>(
        'ChildProviderUnavailable',
      )
    }),
  ),
)
const selectedGraphParentBase = define('AuthoringSelectedGraphParent').define({
  Model: GraphParentModel,
  Message: GraphParentMessage,
})
const SelectedGraphChildBinding = selectedGraphParentBase.bindChild(
  SelectedGraphChild,
  {
    placement: 'selected-child',
    read: (model: GraphParentModel) => Option.some(model.child),
    write: (model, child) => ({ ...model, child }),
    parentMessage: GraphParentMessage.GotChildMessage,
  },
)
const SelectedGraphParent = selectedGraphParentBase
  .makeComposition({ childBindings: [SelectedGraphChildBinding] })
  .makeBlock(graphParentImplementation)
  .replaceEffectsLayer(Layer.empty)

const SelectedGraphParentWithFailure = SelectedGraphParent.replaceEffectsLayer(
  Layer.effectDiscard(
    Effect.fail<'ParentProviderUnavailable'>('ParentProviderUnavailable'),
  ),
)

const PolicyParentOwner = define('AuthoringPolicyParent')

const PolicyParentModel = Schema.Struct({ choice: StringChoice.Model })
type PolicyParentModel = typeof PolicyParentModel.Type

const policyParentBase = PolicyParentOwner.define({
  Model: PolicyParentModel,
  Message: HomeMessage,
})
const ChoiceWithPolicyCommandBinding = policyParentBase.bindChild(
  StringChoice,
  {
    fromParentMessage: false,
    placement: 'choice',
    read: (model: PolicyParentModel) => Option.some(model.choice),
    write: (
      model: PolicyParentModel,
      choice: typeof StringChoice.Model.Type,
    ) => ({
      ...model,
      choice,
    }),
    toParentMessage: () => HomeMessage.ClickedCreateRoom(),
    outMessage: {
      fold: () => (model: PolicyParentModel) => ({
        model,
        commands: [CreateRoom()],
      }),
    },
  },
)

const policyParentComposition = policyParentBase.makeComposition({
  childBindings: [ChoiceWithPolicyCommandBinding],
})
const policyParentUpdate = policyParentComposition.makeUpdate(
  (model, message) =>
    HomeMessage.match(message, {
      ClickedCreateRoom: () =>
        ChoiceWithPolicyCommandBinding.finish('Two')(model),
      CompletedCreateRoom: () => ({ model }),
    }),
)

const PolicyParent = policyParentComposition.makeBlock({
  init: () => ({
    model: PolicyParentModel.make({
      choice: StringChoice.Model.make({ value: 'One' }),
    }),
  }),
  update: policyParentUpdate,
  view: policyParentComposition.makeView((_model, h) => h.empty),
  EffectsLayer: Layer.empty,
  hostHandlers: [CreateRoom],
})

const PolicyParentWithHostProvider = PolicyParent.provideHandlers(
  CreateRoom.toLayer(
    Effect.succeed(() =>
      Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'provided' })),
    ),
  ),
)

const PolicyParentWithSelectedHostProvider =
  PolicyParentWithHostProvider.replaceEffectsLayer(
    CreateRoom.toLayer(
      Effect.succeed(() =>
        Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'selected' })),
      ),
    ),
  )
const PolicyBindingParent = define('AuthoringPolicyBindingParent', {
  Model: PolicyParentModel,
  Message: HomeMessage,
})
const PolicyKeyedParent = define('AuthoringPolicyKeyedParent', {
  Model: Schema.Array(PolicyParentModel),
  Message: HomeMessage,
})

const PolicyConflictChildOwner = define('AuthoringPolicyConflictChild')
const ForeignPolicyConflictChildOwner = define('AuthoringPolicyConflictChild')
const PolicyConflictChildModel = Schema.Struct({ value: Schema.String })
type PolicyConflictChildModel = typeof PolicyConflictChildModel.Type
const PolicyConflictChildMessage = defineMessageUnion({ CompletedRun: {} })
type PolicyConflictChildMessage = typeof PolicyConflictChildMessage.Type
const PolicyConflictChildOutMessage = defineMessageUnion({ RequestedRun: {} })
type PolicyConflictChildOutMessage = typeof PolicyConflictChildOutMessage.Type

const RunPolicyChild = PolicyConflictChildOwner.command('Run', {
  args: { value: Schema.String },
  messages: [PolicyConflictChildMessage.CompletedRun],
  handler: function* () {
    return () => Effect.succeed(PolicyConflictChildMessage.CompletedRun())
  },
})

const ConflictingRunPolicyChild = ForeignPolicyConflictChildOwner.command(
  'Run',
  {
    args: { value: Schema.Number },
    messages: [PolicyConflictChildMessage.CompletedRun],
  },
)

const PolicyConflictChild = PolicyConflictChildOwner.define({
  Model: PolicyConflictChildModel,
  Message: PolicyConflictChildMessage,
  OutMessage: PolicyConflictChildOutMessage,
})

const policyConflictChildComposition = PolicyConflictChild.makeComposition()
const PolicyConflictChildBlock = policyConflictChildComposition.makeBlock({
  init: () => ({ model: PolicyConflictChildModel.make({ value: '' }) }),
  update: policyConflictChildComposition.makeUpdate((model, _message) => ({
    model,
    outMessage: PolicyConflictChildOutMessage.RequestedRun(),
  })),
  EffectsLayer: RunPolicyChild.layer,
})

const PolicyConflictParentModel = Schema.Struct({
  child: PolicyConflictChildModel,
})
type PolicyConflictParentModel = typeof PolicyConflictParentModel.Type

const policyConflictParentBase = define('AuthoringPolicyConflictParent').define(
  {
    Model: PolicyConflictParentModel,
    Message: HomeMessage,
  },
)
const PolicyConflictChildBinding = policyConflictParentBase.bindChild(
  PolicyConflictChildBlock,
  {
    fromParentMessage: false,
    placement: 'policy-conflict-child',
    read: (model: PolicyConflictParentModel) => Option.some(model.child),
    write: (model, child) => ({ ...model, child }),
    toParentMessage: () => HomeMessage.ClickedCreateRoom(),
    outMessage: {
      fold:
        (
          _outMessage: PolicyConflictChildOutMessage,
          {
            liftCommand,
          }: Update.FoldContext<PolicyConflictChildMessage, HomeMessage>,
        ) =>
        (model: PolicyConflictParentModel) => ({
          model,
          commands: [liftCommand(ConflictingRunPolicyChild({ value: 1 }))],
        }),
    },
  },
)
const policyConflictParentComposition =
  policyConflictParentBase.makeComposition({
    childBindings: [PolicyConflictChildBinding],
  })

if (false) {
  const ForeignOwnedMessage = defineMessageUnion({ CompletedForeign: {} })
  home.subscriptions(entry => {
    entry('Foreign', {
      // @ts-expect-error The owned Subscription builder rejects foreign Message schemas.
      messages: [ForeignOwnedMessage.CompletedForeign],
    })
    return {
      valid: entry('Valid', {
        messages: [HomeMessage.CompletedCreateRoom],
      }),
    }
  })

  const foreign = define('AuthoringForeign').define({
    Model: HomeModel,
    Message: ForeignOwnedMessage,
  })
  const foreignSubscriptions = foreign.subscriptions(entry => ({
    foreign: entry('Foreign', {
      messages: [ForeignOwnedMessage.CompletedForeign],
    }),
  }))
  home.subscriptions(() => ({
    // @ts-expect-error A foreign Subscription registry cannot bypass the owned builder.
    foreign: foreignSubscriptions.foreign,
  }))

  home.managedResources(entry => ({
    foreign: entry('Foreign', Schema.Option(Schema.Null), {
      resource: SelectedRoom,
      modelToMaybeRequirements: () => Option.none(),
      onAcquired: (roomId: string) =>
        HomeMessage.CompletedCreateRoom({ roomId }),
      // @ts-expect-error Owned ManagedResources may emit only the definition's Message.
      onReleased: () => ForeignOwnedMessage.CompletedForeign(),
      onAcquireError: () =>
        HomeMessage.CompletedCreateRoom({ roomId: 'failed' }),
    }),
  }))

  const maybeCreateRoomCommands = (shouldCreateRoom: boolean) =>
    shouldCreateRoom ? [CreateRoom()] : undefined
  const initWithForwardedCommands = (shouldCreateRoom: boolean) => ({
    model: HomeModel.make({ status: 'Idle', joinedCount: 0 }),
    commands: maybeCreateRoomCommands(shouldCreateRoom),
  })
  const updateWithForwardedCommands = HomeComposition.makeUpdate(
    (model, _message, shouldCreateRoom: boolean) => ({
      model,
      commands: maybeCreateRoomCommands(shouldCreateRoom),
    }),
  )
  const bootWithForwardedCommands = home.step(
    (model, shouldCreateRoom: boolean) => ({
      model,
      commands: maybeCreateRoomCommands(shouldCreateRoom),
    }),
  )
  const HomeWithForwardedCommands = HomeComposition.makeBlock({
    init: initWithForwardedCommands,
    update: updateWithForwardedCommands,
    expose: { boot: bootWithForwardedCommands },
    EffectsLayer: CreateRoom.layer,
  })

  const collidingFold = home.step(model => ({ model }))
  HomeComposition.makeBlock({
    init: homeInit,
    update: homeUpdate,
    expose: { fold: collidingFold },
    // @ts-expect-error An exposed operation cannot overwrite a Binding member.
    EffectsLayer: CreateRoom.layer,
  })

  expectTypeOf<
    Update.RequirementsOf<typeof initWithForwardedCommands>
  >().toEqualTypeOf<Command.HandlerOf<typeof CreateRoom>>()
  expectTypeOf<
    Update.RequirementsOf<typeof updateWithForwardedCommands>
  >().toEqualTypeOf<Command.HandlerOf<typeof CreateRoom>>()
  expectTypeOf<
    Update.RequirementsOf<typeof bootWithForwardedCommands>
  >().toEqualTypeOf<Command.HandlerOf<typeof CreateRoom>>()
  expectTypeOf(HomeWithForwardedCommands.update)
    .parameter(2)
    .toEqualTypeOf<boolean>()
  expectTypeOf(HomeWithForwardedCommands.expose.boot)
    .parameter(1)
    .toEqualTypeOf<boolean>()

  // @ts-expect-error Omitting EffectsLayer still rejects unresolved local handlers.
  HomeComposition.makeBlock({
    init: homeInit,
    update: homeUpdate,
  })

  const erasedImplementation: Implementation<
    HomeModel,
    HomeMessage,
    HomeOutMessage
  > = homeImplementation
  const erasedBlock = HomeComposition.makeBlock(erasedImplementation)
  // @ts-expect-error A broad annotation cannot produce a usable block.
  erasedBlock.init
  const ErasedBlockApplication = defineApplication({
    Model: HomeModel,
    Message: HomeMessage,
  })
  ErasedBlockApplication.makeComposition().makeElement({
    // @ts-expect-error A reusable Block cannot become an application root.
    block: erasedBlock,
    container: null,
    init: homeInit,
    update: homeUpdate,
    view: homeView,
    EffectsLayer: CreateRoom.layer,
  })

  // @ts-expect-error Selecting a recipe still requires every local handler.
  Home.replaceEffectsLayer(Layer.empty)

  const erasedInputs: Layer.Layer<
    Command.HandlerOf<typeof CreateRoom>,
    never,
    any
  > = CreateRoomTestLayer
  // oxlint-disable effecttsgo/any-unknown-in-error-context
  // @ts-expect-error A selected recipe must preserve exact construction inputs.
  Home.replaceEffectsLayer(erasedInputs)
  // oxlint-enable effecttsgo/any-unknown-in-error-context

  const erasedOutputs: Layer.Layer<any> = CreateRoomTestLayer
  // @ts-expect-error A selected recipe must preserve exact handler outputs.
  Home.replaceEffectsLayer(erasedOutputs)

  const ConflictingCreateRoom = HomeOwner.command('CreateRoom', {
    args: { foreignId: Schema.String },
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'foreign' }))
    },
  })
  Home.replaceEffectsLayer(
    // @ts-expect-error Same-name selected handlers must preserve the exact original contract.
    Layer.merge(CreateRoomTestLayer, ConflictingCreateRoom.layer),
  )

  const CrossKindOwner = define('AuthoringCrossKind')
  const CommandFocus = CrossKindOwner.command('Focus', {
    messages: [HomeMessage.CompletedCreateRoom],
  })
  const MountFocus = CrossKindOwner.mount('Focus', {
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'focused' }))
    },
  })
  const crossKindBase = CrossKindOwner.define({
    Model: HomeModel,
    Message: HomeMessage,
  })
  const crossKindComposition = crossKindBase.makeComposition({
    mounts: [MountFocus],
  })
  crossKindComposition.makeBlock({
    init: homeInit,
    update: model => ({ model, commands: [CommandFocus()] }),
    // @ts-expect-error A same-name Mount handler cannot satisfy a Command contract.
    EffectsLayer: MountFocus.layer,
  })

  Room.replaceEffectsLayer(
    // @ts-expect-error Selection retains the exact residual host contract.
    LoadRoom.toLayer(
      Effect.succeed(() => Effect.succeed(RoomMessage.CompletedLoadRoom())),
    ),
  )

  // @ts-expect-error Host handlers can be supplied only while the declared contract is unresolved.
  RoomWithHostProvider.provideHandlers(CreateRoomTestLayer)

  // @ts-expect-error A host provider cannot substitute an unrelated Foldkit handler.
  Room.provideHandlers(CreateRoomTestLayer)

  Room.provideHandlers(
    // @ts-expect-error A host provider cannot add undeclared Foldkit handlers.
    Layer.merge(
      LoadRoom.toLayer(
        Effect.succeed(() => Effect.succeed(RoomMessage.CompletedLoadRoom())),
      ),
      CreateRoomTestLayer,
    ),
  )

  // @ts-expect-error Empty Block IDs cannot create authoring definitions.
  define('').define
  // @ts-expect-error Block IDs with path separators cannot create authoring definitions.
  define('Authoring/Invalid').define
  // @ts-expect-error Block IDs cannot introduce a scoped identity separator.
  define('Authoring::Invalid').define
  // @ts-expect-error Typed Block IDs cannot introduce a scoped identity separator.
  define('Authoring::Invalid', { Model: HomeModel, Message: HomeMessage })
  // @ts-expect-error Local definition names cannot introduce a scoped identity separator.
  HomeOwner.command('Nested::CreateRoom', {
    messages: [HomeMessage.CompletedCreateRoom],
  })
  // @ts-expect-error Local definition names cannot introduce another namespace.
  HomeOwner.command('Nested/CreateRoom', {
    messages: [HomeMessage.CompletedCreateRoom],
  })

  HomeComposition.makeView(
    // @ts-expect-error Views use the Model fixed by the Block definition.
    (_model: Readonly<{ foreign: true }>, h) => h.div([]),
  )

  HomeComposition.makeView((_model, h) =>
    h.div([
      // @ts-expect-error The view may use only Mounts registered by its definition or child Bindings.
      h.OnMount(ObserveChoice()),
    ]),
  )

  const ObserveHomeView = HomeOwner.mount('ObserveHomeView', {
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(
          HomeMessage.CompletedCreateRoom({ roomId: 'mounted-room' }),
        )
    },
  })
  const ObserveSecondaryHomeView = HomeOwner.mount('ObserveSecondaryHomeView', {
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(
          HomeMessage.CompletedCreateRoom({ roomId: 'secondary-room' }),
        )
    },
  })
  const subsetHomeViewBase = HomeOwner.define({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  })
  const subsetHomeViewComposition = subsetHomeViewBase.makeComposition({
    mounts: [ObserveHomeView],
  })
  const subsetHomeView = subsetHomeViewComposition.makeView((_model, h) =>
    h.div([]),
  )
  subsetHomeView satisfies Readonly<{
    __blockDefinitionView: Readonly<{
      mountRequirements: () => Mount.RequirementsOf<
        readonly [typeof ObserveHomeView, typeof ObserveSecondaryHomeView]
      >
    }>
  }>
  const supersetHomeViewBase = HomeOwner.define({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  })
  const supersetHomeViewComposition = supersetHomeViewBase.makeComposition({
    mounts: [ObserveHomeView, ObserveSecondaryHomeView],
  })
  supersetHomeViewComposition.makeBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: subsetHomeView,
    EffectsLayer: Layer.merge(
      ObserveHomeView.layer,
      ObserveSecondaryHomeView.layer,
    ),
  })

  const ForeignHomeOwner = define('AuthoringForeignHomeView')
  const foreignHome = ForeignHomeOwner.define({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  })
  const foreignHomeComposition = foreignHome.makeComposition()
  const foreignHomeView = foreignHomeComposition.makeView((_model, h) =>
    h.div([]),
  )
  HomeComposition.makeBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    // @ts-expect-error A completed Block must use a view authored by its own definition.
    view: foreignHomeView,
    EffectsLayer: Layer.empty,
  })

  const sameOwnerDifferent = HomeOwner.define({
    Model: RoomModel,
    Message: RoomMessage,
  })
  const sameOwnerDifferentComposition = sameOwnerDifferent.makeComposition()
  const sameOwnerDifferentView = sameOwnerDifferentComposition.makeView(
    (_model, h) => h.div([]),
  )
  HomeComposition.makeBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    // @ts-expect-error Owner identity cannot substitute for the definition's Model and Message view channels.
    view: sameOwnerDifferentView,
    EffectsLayer: Layer.empty,
  })

  const erasedHomeView: any = homeView
  // @ts-expect-error any cannot erase an implementation's authored view contract.
  HomeComposition.makeBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: erasedHomeView,
    EffectsLayer: Layer.empty,
  })

  HomeComposition.makeBlock({
    // @ts-expect-error Specialized implementation shapes retain the definition Model returned by init.
    init: () => ({
      model: RoomModel.make({ roomId: 'foreign', joinedCount: 0 }),
    }),
    // @ts-expect-error Specialized implementation shapes retain the definition Model and Message accepted by update.
    update: (model: RoomModel, _message: RoomMessage) => ({ model }),
    view: homeView,
    EffectsLayer: Layer.empty,
  })

  HomeComposition.makeBlock({
    init: () => ({
      // @ts-expect-error Specialized implementation shapes with Subscriptions retain the definition Model returned by init.
      model: RoomModel.make({ roomId: 'foreign', joinedCount: 0 }),
    }),
    // @ts-expect-error Specialized implementation shapes with Subscriptions retain the definition Model and Message accepted by update.
    update: (model: RoomModel, _message: RoomMessage) => ({ model }),
    view: homeView,
    subscriptions: {},
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error void would collapse the three-argument view to two arguments.
  HomeComposition.makeView.withInputs<void>((_model, _inputs, h) => h.div([]))
  // @ts-expect-error undefined would collapse the three-argument view to two arguments.
  HomeComposition.makeView.withInputs<undefined>((_model, _inputs, h) =>
    h.div([]),
  )
  // @ts-expect-error never cannot describe a usable viewInputs value.
  HomeComposition.makeView.withInputs<never>((_model, _inputs, h) => h.div([]))
  // @ts-expect-error any would erase the viewInputs contract.
  HomeComposition.makeView.withInputs<any>((_model, _inputs, h) => h.div([]))

  policyParentComposition.makeView((model, h) => {
    const config = ChoiceWithPolicyCommandBinding.embedView({
      slotId: 'compact-evidence',
      model: model.choice,
      viewInputs: { label: 'Choice' },
    })

    h.block(config)

    h.block({
      // @ts-expect-error A bare object cannot forge private binding scope evidence.
      __blockConfigEvidence: {
        config,
        parentMessage: HomeMessage.ClickedCreateRoom(),
        mountRequirements: ObserveChoice,
      },
    })

    // @ts-expect-error A bound render config must preserve its child Model.
    h.block({
      ...config,
      model: HomeModel.make({ status: 'Idle', joinedCount: 0 }),
    })

    // @ts-expect-error A bound render config must preserve its authored view.
    h.block({ ...config, view: homeView })

    // @ts-expect-error A bound render config must preserve its viewInputs.
    h.block({ ...config, viewInputs: { wrong: true } })

    const erasedParentMessage: BoundBlockConfig<(typeof config)['view'], any> =
      config
    // @ts-expect-error A bound render config cannot erase its parent Message with any.
    h.block(erasedParentMessage)

    const OmittedChoiceBinding = policyParentBase.bindChild(StringChoice, {
      fromParentMessage: false,
      placement: 'omitted-compact-evidence',
      read: (parentModel: PolicyParentModel) => Option.some(parentModel.choice),
      write: (
        parentModel: PolicyParentModel,
        choice: typeof StringChoice.Model.Type,
      ) => ({ ...parentModel, choice }),
      toParentMessage: () => HomeMessage.ClickedCreateRoom(),
      outMessage: {
        fold: () => (parentModel: PolicyParentModel) => ({
          model: parentModel,
        }),
      },
    })
    const omittedConfig = OmittedChoiceBinding.embedView({
      slotId: 'omitted-compact-evidence',
      model: model.choice,
      viewInputs: { label: 'Omitted choice' },
    })
    // @ts-expect-error A public lookalike field cannot replace private binding evidence.
    h.block({
      ...omittedConfig,
      __blockConfigEvidence: {
        config,
        parentMessage: HomeMessage.ClickedCreateRoom(),
        mountRequirements: ObserveChoice,
      },
    })

    return h.empty
  })

  HomeComposition.makeUpdate(
    // @ts-expect-error Updates use the Model fixed by the Block definition.
    (model: RoomModel, _message: HomeMessage) => ({ model }),
  )

  RoomComposition.makeUpdate((model, _message) => ({
    model,
    // @ts-expect-error A Block without OutMessage cannot emit one.
    outMessage: HomeOutMessage.CreatedRoom({ roomId: model.roomId }),
  }))

  HomeComposition.makeUpdate((model, _message, context) => {
    // @ts-expect-error Extra update context requires an explicit type annotation.
    context.nonexistent
    return { model }
  })

  home.step((model, input) => {
    // @ts-expect-error Extra Step input requires an explicit type annotation.
    input.nonexistent
    return { model }
  })

  RoomComposition.makeBlock({
    init: flags => {
      // @ts-expect-error Inline init parameters require explicit annotations.
      flags.nonexistent
      return { model: RoomModel.make({ roomId: '', joinedCount: 0 }) }
    },
    update: (model, _message, context) => {
      // @ts-expect-error Inline update context requires an explicit annotation.
      context.nonexistent
      return { model }
    },
    expose: {
      inspect: (model, input) => {
        // @ts-expect-error Inline Step inputs require explicit annotations.
        input.nonexistent
        return { model }
      },
    },
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error Explicit any context erases the operation contract.
  home.step((model, _input: any) => ({ model }))

  // @ts-expect-error Explicit any context erases the operation contract.
  HomeComposition.makeUpdate((model, _message, _context: any) => ({ model }))

  graphParentComposition.makeBlock({
    init: GraphParent.init,
    update: model => ({
      model,
      commands: [RunParentWork()],
    }),
    // @ts-expect-error A parent operation remains uncovered by a child-provided Layer.
    EffectsLayer: Layer.empty,
  })

  const unregisteredGraphParent = define(
    'AuthoringUnregisteredGraphParent',
  ).define({
    Model: GraphParentModel,
    Message: GraphParentMessage,
  })
  const UnregisteredGraphChildBinding = unregisteredGraphParent.bindChild(
    GraphChildBlock,
    {
      placement: 'unregistered-child',
      read: (model: GraphParentModel) => Option.some(model.child),
      write: (model, child) => ({ ...model, child }),
      parentMessage: GraphParentMessage.GotChildMessage,
    },
  )
  const unregisteredGraphComposition = unregisteredGraphParent.makeComposition()
  const unregisteredGraphUpdate = unregisteredGraphComposition.makeUpdate(
    (model, message) =>
      GraphParentMessage.match(message, {
        GotChildMessage: ({ message }) =>
          // @ts-expect-error An unregistered Binding cannot fold a raw Model.
          UnregisteredGraphChildBinding.fold(model, message),
        RequestedParentWork: () => ({ model }),
        CompletedParentWork: () => ({ model }),
      }),
  )
  unregisteredGraphComposition.makeBlock({
    // @ts-expect-error An unregistered Binding cannot contribute initialization.
    init: () =>
      UnregisteredGraphChildBinding.init({
        args: [],
        toParentModel: child => GraphParentModel.make({ child }),
      }),
    update: unregisteredGraphUpdate,
    // @ts-expect-error An unregistered Binding cannot satisfy implementation evidence.
    EffectsLayer: Layer.empty,
  })

  const policyConflictUpdate = policyConflictParentComposition.makeUpdate(
    (model, message) =>
      HomeMessage.match(message, {
        ClickedCreateRoom: () =>
          PolicyConflictChildBinding.fold(
            model,
            PolicyConflictChildMessage.CompletedRun(),
          ),
        CompletedCreateRoom: () => ({ model }),
      }),
  )
  policyConflictParentComposition.makeBlock({
    init: () => ({
      model: PolicyConflictParentModel.make({
        child: PolicyConflictChildModel.make({ value: '' }),
      }),
    }),
    update: policyConflictUpdate,
    // @ts-expect-error A scoped policy Command must exactly match the registered child handler contract.
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error A child named Step's OutMessage policy Command requires its matching host handler.
  policyParentComposition.makeBlock({
    init: PolicyParent.init,
    update: PolicyParent.update,
    EffectsLayer: Layer.empty,
    hostHandlers: [ObserveChoice],
  })

  const mismatchedGraphParentBase = GraphParentOwner.define({
    Model: HomeModel,
    Message: GraphParentMessage,
  })
  // @ts-expect-error Child bindings must use the definition's parent Model.
  mismatchedGraphParentBase.makeComposition({
    childBindings: [GraphChildBinding],
  })

  const foreignCommandParentBase = GraphParentOwner.define({
    Model: GraphParentModel,
    Message: GraphParentMessage,
  })
  foreignCommandParentBase.bindChild(StringChoice, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'foreign-command-message',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (_model: GraphParentModel) =>
      Option.some(StringChoice.Model.make({ value: 'One' })),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: (model: GraphParentModel) => model,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: () => GraphParentMessage.CompletedParentWork(),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: {
      fold: () => (model: GraphParentModel) => ({
        model,
        commands: [CreateRoom()],
      }),
    },
  })

  const ParentOutMessage = defineMessageUnion({ AcceptedChildResult: {} })
  const foreignForwardParentBase = GraphParentOwner.define({
    Model: GraphParentModel,
    Message: GraphParentMessage,
    OutMessage: ParentOutMessage,
  })
  foreignForwardParentBase.bindChild(StringChoice, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'foreign-forward',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (_model: GraphParentModel) =>
      Option.some(StringChoice.Model.make({ value: 'One' })),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: (model: GraphParentModel) => model,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: () => GraphParentMessage.CompletedParentWork(),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: {
      forward: () => HomeOutMessage.CreatedRoom({ roomId: 'foreign' }),
    },
  })
  const missingForwardParentBase = GraphParentOwner.define({
    Model: GraphParentModel,
    Message: GraphParentMessage,
  })
  // @ts-expect-error This invalid Binding configuration has no matching overload.
  missingForwardParentBase.bindChild(StringChoice, {
    placement: 'missing-forward',
    read: (_model: GraphParentModel) =>
      Option.some(StringChoice.Model.make({ value: 'One' })),
    write: (model: GraphParentModel) => model,
    toParentMessage: () => GraphParentMessage.CompletedParentWork(),
    outMessage: {
      forward: () => ParentOutMessage.AcceptedChildResult(),
    },
  })

  const foreignDerivedParentBase = GraphParentOwner.define({
    Model: GraphParentModel,
    Message: GraphParentMessage,
    OutMessage: ParentOutMessage,
  })
  foreignDerivedParentBase.bindChild(StringChoice, {
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    placement: 'foreign-derived-out-message',
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    read: (_model: GraphParentModel) =>
      Option.some(StringChoice.Model.make({ value: 'One' })),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    write: (model: GraphParentModel) => model,
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    toParentMessage: () => GraphParentMessage.CompletedParentWork(),
    // @ts-expect-error This invalid Binding configuration has no matching overload.
    outMessage: {
      fold: () => (model: GraphParentModel) => ({
        model,
        outMessage: HomeOutMessage.CreatedRoom({ roomId: 'foreign' }),
      }),
    },
  })
}

describe('Block authoring', () => {
  it('preserves exact contracts for a Block with no Messages', () => {
    expectTypeOf(NoMessage.update).toEqualTypeOf<
      (model: null, message: never) => Update.Return<null, never>
    >()
    expectTypeOf<RequirementsOfBlock<typeof NoMessage>>().toEqualTypeOf<never>()
    expectTypeOf<
      OperationRequirementsOfBlock<typeof NoMessage>
    >().toEqualTypeOf<never>()
    expect(NoMessage[LocalEffectsLayerTypeId]).toBe(Layer.empty)
  })

  it('preserves exact selected Layer channels without changing operation contracts', () => {
    expectTypeOf<
      RequirementsOfBlock<typeof HomeWithTestProvider>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      RequirementsOfBlock<typeof HomeWithSelectedClient>
    >().toEqualTypeOf<SelectedRoomsClient>()
    expectTypeOf<
      OperationRequirementsOfBlock<typeof HomeWithSelectedClient>
    >().toEqualTypeOf<Command.HandlerOf<typeof CreateRoom>>()
    expectTypeOf<
      Layer.Success<typeof HomeWithSelectedClient.EffectsLayer>
    >().toEqualTypeOf<Command.HandlerOf<typeof CreateRoom>>()
    expectTypeOf<
      Layer.Services<typeof HomeWithSelectedClient.EffectsLayer>
    >().toEqualTypeOf<SelectedRoomsClient>()
    expectTypeOf<
      Layer.Error<typeof HomeWithFailedBuild.EffectsLayer>
    >().toEqualTypeOf<'ProviderUnavailable'>()
    expectTypeOf<
      RequirementsOfBlock<typeof SelectedGraphParent>
    >().toEqualTypeOf<SelectedRoomsClient>()
    expectTypeOf<
      Layer.Success<typeof SelectedGraphParent.EffectsLayer>
    >().toEqualTypeOf<
      Scoped<'selected-child', Command.HandlerOf<typeof RunChildWork>>
    >()
    expectTypeOf<
      OperationRequirementsOfBlock<typeof SelectedGraphParent>
    >().toEqualTypeOf<
      Scoped<'selected-child', Command.HandlerOf<typeof RunChildWork>>
    >()
    expectTypeOf<
      Layer.Error<typeof SelectedGraphParentWithFailure.EffectsLayer>
    >().toEqualTypeOf<
      'ChildProviderUnavailable' | 'ParentProviderUnavailable'
    >()
    expectTypeOf<
      Layer.Services<typeof SelectedGraphParentWithFailure.EffectsLayer>
    >().toEqualTypeOf<SelectedRoomsClient>()
    expectTypeOf(HomeWithTestProvider.update).toEqualTypeOf(Home.update)
    expectTypeOf(HomeWithTestProvider.init).toEqualTypeOf(Home.init)
    expectTypeOf(HomeWithTestProvider.expose).toEqualTypeOf(Home.expose)
    expectTypeOf<
      RequirementsOfBlock<typeof HomeWithCheckedImplementation>
    >().toEqualTypeOf<never>()
    expectTypeOf(Room.replaceEffectsLayer(Layer.empty).update).toEqualTypeOf(
      Room.update,
    )
    expectTypeOf(
      StringChoice.replaceEffectsLayer(Layer.empty).expose.finish,
    ).toEqualTypeOf(StringChoice.expose.finish)

    expect(HomeWithTestProvider.Model).toBe(Home.Model)
    expect(HomeWithTestProvider.Message).toBe(Home.Message)
    expect(HomeWithTestProvider.OutMessage).toBe(Home.OutMessage)
    expect(HomeWithTestProvider.makeView).toBe(Home.makeView)
    expect(HomeWithTestProvider.init).toBe(Home.init)
    expect(HomeWithTestProvider.update).toBe(Home.update)
    expect(HomeWithTestProvider.expose).toBe(Home.expose)
    expect(HomeWithTestProvider.childBindings).toBe(Home.childBindings)
    expect(HomeWithTestProvider.hostHandlers).toEqual(Home.hostHandlers)
    expect(HomeWithTestProvider.EffectsLayer).not.toBe(CreateRoomTestLayer)
    expect(HomeWithTestProvider[LocalEffectsLayerTypeId]).toBe(
      CreateRoomTestLayer,
    )
  })

  it('runs Commands through the selected handler definition', async () => {
    const message = await Effect.runPromise(
      Effect.provide(CreateRoom().effect, HomeWithTestProvider.EffectsLayer),
    )

    expect(message).toEqual(
      HomeMessage.CompletedCreateRoom({ roomId: 'test-room' }),
    )
    expect(createRoomHandlerBuilds).toBe(0)
  })

  it('selects a local recipe passively and preserves selected child constructors', async () => {
    const ParentOwner = define('AuthoringSelectedRecipe')
    const ChildOwner = define('AuthoringSelectedRecipeChild')
    let defaultParentBuilds = 0
    let selectedParentBuilds = 0
    let defaultChildBuilds = 0
    let selectedChildBuilds = 0

    class DefaultProviderClient extends Context.Service<
      DefaultProviderClient,
      Readonly<{ name: string }>
    >()('AuthoringDefaultProviderClient') {}

    const DefaultParentLayer = Layer.suspend(() => {
      defaultParentBuilds += 1
      return Layer.effectDiscard(DefaultProviderClient)
    })
    const SelectedParentLayer = Layer.suspend(() => {
      selectedParentBuilds += 1
      return Layer.empty
    })
    const DefaultChildLayer = Layer.suspend(() => {
      defaultChildBuilds += 1
      return Layer.empty
    })
    const SelectedChildLayer = Layer.suspend(() => {
      selectedChildBuilds += 1
      return Layer.empty
    })

    const child = bindLeaf(
      makeLeaf(ChildOwner, DefaultChildLayer).replaceEffectsLayer(
        SelectedChildLayer,
      ),
      'child',
    )
    const base = ParentOwner.define({
      Model: LeafParentModel,
      Message: LeafMessage,
    })
    const definition = base.makeComposition({
      childBindings: [child],
    })
    const block = definition.makeBlock({
      init: () => ({
        model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
      }),
      update: (model, _message) => ({ model }),
      EffectsLayer: DefaultParentLayer,
    })
    const replaceEffectsLayer = block.replaceEffectsLayer
    const selected = replaceEffectsLayer(SelectedParentLayer)

    expectTypeOf<
      RequirementsOfBlock<typeof block>
    >().toEqualTypeOf<DefaultProviderClient>()
    expectTypeOf<RequirementsOfBlock<typeof selected>>().toEqualTypeOf<never>()

    expect(defaultParentBuilds).toBe(0)
    expect(selectedParentBuilds).toBe(0)
    expect(defaultChildBuilds).toBe(0)
    expect(selectedChildBuilds).toBe(0)
    expect(selected.childBindings).toBe(block.childBindings)

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(selected.EffectsLayer)))

    expect(defaultParentBuilds).toBe(0)
    expect(selectedParentBuilds).toBe(1)
    expect(defaultChildBuilds).toBe(0)
    expect(selectedChildBuilds).toBe(1)
  })

  it('builds differently selected occurrences independently at distinct placements', async () => {
    const RepeatedOwner = define('AuthoringSelectedConflict')
    let defaultBuilds = 0
    let selectedBuilds = 0
    const block = makeLeaf(
      RepeatedOwner,
      Layer.suspend(() => {
        defaultBuilds += 1
        return Layer.empty
      }),
    )
    const selected = block.replaceEffectsLayer(
      Layer.suspend(() => {
        selectedBuilds += 1
        return Layer.empty
      }),
    )
    const ParentOwner = define('AuthoringSelectedConflictParent')
    const base = ParentOwner.define({
      Model: LeafParentModel,
      Message: LeafMessage,
    })
    const definition = base.makeComposition({
      childBindings: [
        bindLeaf(block, 'default'),
        bindLeaf(selected, 'selected'),
      ],
    })
    const parent = definition.makeBlock({
      init: () => ({
        model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
      }),
      update: (model, _message) => ({ model }),
      EffectsLayer: Layer.empty,
    })

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer)))

    expect(defaultBuilds).toBe(1)
    expect(selectedBuilds).toBe(1)
  })

  it('qualifies primitive names with the named Block ID', () => {
    expect(CreateRoom.name).toBe('AuthoringHome/CreateRoom')
    expectTypeOf(CreateRoom.name).toEqualTypeOf<
      OwnedName<'AuthoringHome', 'CreateRoom'>
    >()
    expectTypeOf(SaveRoom.name).toEqualTypeOf<'AuthoringHome/SaveRoom'>()
    expectTypeOf(SaveRoom.Interrupt)
      .parameter(0)
      .toEqualTypeOf<Readonly<{ roomId: string }>>()
  })

  it('qualifies owned Mount and lifecycle definitions while preserving their inferred contracts', () => {
    expect(ObserveRooms.name).toBe('AuthoringHome/ObserveRooms')
    expect(homeSubscriptions.rooms.name).toBe('AuthoringHome/Rooms')
    expect(homeManagedResources.selectedRoom.name).toBe(
      'AuthoringHome/SelectedRoom',
    )
    expect(SelectedRoom.key).toBe('AuthoringHome/SelectedRoom')
    expectTypeOf(
      ObserveRooms.name,
    ).toEqualTypeOf<'AuthoringHome/ObserveRooms'>()
    expectTypeOf<
      Layer.Success<typeof homeSubscriptions.rooms.layer>
    >().toEqualTypeOf<
      Subscription.Handler<
        'AuthoringHome/Rooms',
        Readonly<{ joinedCount: number }>,
        typeof HomeMessage.CompletedCreateRoom.Type
      >
    >()
    expectTypeOf<
      Layer.Error<typeof homeSubscriptions.rooms.layer>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Layer.Services<typeof homeSubscriptions.rooms.layer>
    >().toEqualTypeOf<never>()
    expectTypeOf(homeSubscriptions.rooms.messages).toEqualTypeOf<
      [typeof HomeMessage.CompletedCreateRoom]
    >()
    expectTypeOf<
      Layer.Success<typeof homeManagedResources.selectedRoom.layer>
    >().toEqualTypeOf<
      ManagedResource.Handler<'AuthoringHome/SelectedRoom', null, string>
    >()
  })

  it('fills declared host handlers through an ordinary Layer', async () => {
    expect(RoomWithHostProvider.hostHandlers).toEqual([])

    const message = await Effect.runPromise(
      Effect.provide(
        LoadRoom({ roomId: 'room-1' }).effect,
        RoomWithHostProvider.EffectsLayer,
      ),
    )

    expect(message).toEqual(RoomMessage.CompletedLoadRoom())
    expectTypeOf<
      RequirementsOfBlock<typeof RoomWithHostProvider>
    >().toEqualTypeOf<never>()
  })

  it('rejects invalid dynamic Block IDs and local names', () => {
    expect(() => define(globalThis.String('Authoring/Invalid'))).toThrow(
      /ID must be non-empty/,
    )
    expect(() => define(globalThis.String('Authoring::Invalid'))).toThrow(
      /ID must be non-empty/,
    )
    expect(() =>
      HomeOwner.command(globalThis.String('Nested::CreateRoom'), {
        messages: [HomeMessage.CompletedCreateRoom],
      }),
    ).toThrow(/primitive name must be non-empty/)
    expect(() =>
      HomeOwner.command(globalThis.String('Nested/CreateRoom'), {
        messages: [HomeMessage.CompletedCreateRoom],
      }),
    ).toThrow(/primitive name must be non-empty/)
  })

  it('rejects dynamic exposed operation names that collide with Binding members', () => {
    const name: string = 'fold'

    expect(() =>
      home.makeComposition().makeBlock({
        init: homeInit,
        update: homeUpdate,
        expose: { [name]: homeBoot },
        EffectsLayer: CreateRoom.layer,
      }),
    ).toThrow(
      /Block exposed operation name "fold" collides with a Binding member/,
    )
  })

  it('constructs a passive block with named exposed operations', () => {
    expect(homeInitCalls).toBe(0)
    expect(createRoomHandlerBuilds).toBe(0)
    expect(Home.makeView).toBe(HomeComposition.makeView)
    expect(defaultViewOf(Home)).toBe(homeView)
    expect(Home.expose).toEqual({
      boot: expect.any(Function),
      informJoined: expect.any(Function),
    })
    expect(Home.expose.boot).not.toBe(homeBoot)
    expect(Home.expose.informJoined).not.toBe(homeInformJoined)
    expect(typeof home.makeComposition).toBe('function')
    expect(Home).not.toHaveProperty('connection')

    const homeInit_ = Home.init()

    expect(homeInit_.model).toEqual({ status: 'Idle', joinedCount: 0 })
    expect(homeInitCalls).toBe(1)
  })

  it('preserves update requirements, OutMessages, and contextual Step inputs', () => {
    const model = HomeModel.make({ status: 'Idle', joinedCount: 0 })
    const startedCreate = Home.update(model, HomeMessage.ClickedCreateRoom())
    const informedJoined = Home.expose.informJoined(model, 3)

    expect(startedCreate.model.status).toBe('Creating')
    expect(startedCreate.commands?.map(command => command.name)).toEqual([
      'AuthoringHome/CreateRoom',
    ])
    expect(informedJoined.model.joinedCount).toBe(3)

    expectTypeOf(Home.update).toEqualTypeOf<
      (
        model: HomeModel,
        message: HomeMessage,
      ) => Update.ReturnWithOutMessage<
        HomeModel,
        HomeMessage,
        HomeOutMessage,
        Command.HandlerOf<typeof CreateRoom>
      >
    >()
  })

  it('keeps required and optional context on host-backed Room operations', () => {
    expect(Room.hostHandlers).toEqual([LoadRoom])
    expectTypeOf(Room.update).toEqualTypeOf<
      (
        model: RoomModel,
        message: RoomMessage,
        source: 'Reconnect' | 'Route',
        retryCount?: number,
      ) => Update.Return<
        RoomModel,
        RoomMessage,
        Command.HandlerOf<typeof LoadRoom>
      >
    >()
    expectTypeOf(Room.expose.informJoined).toEqualTypeOf<
      (
        model: RoomModel,
        joinedCount: number,
        source?: 'Lobby' | 'Game',
      ) => Update.Return<RoomModel, RoomMessage>
    >()
  })

  it('retains generic Model and OutMessage payloads with Mount capabilities', () => {
    expect(StringChoice.mounts).toEqual([ObserveChoice])
    expect(StringChoice.hostHandlers).toEqual([ObserveChoice])
    expectTypeOf<typeof StringChoice.Model.Type>().toEqualTypeOf<
      Readonly<{ value: 'One' | 'Two' }>
    >()
    expectTypeOf<typeof StringChoice.OutMessage.Type>().toEqualTypeOf<
      Readonly<{ _tag: 'SelectedChoice'; value: 'One' | 'Two' }>
    >()
    expectTypeOf(StringChoice.expose.finish).toEqualTypeOf<
      (
        model: typeof StringChoice.Model.Type,
        value: 'One' | 'Two',
      ) => Update.ReturnWithOutMessage<
        typeof StringChoice.Model.Type,
        typeof StringChoice.Message.Type,
        typeof StringChoice.OutMessage.Type
      >
    >()
  })

  it('dispatches explicit viewInputs independently of callback arity', () => {
    const registry = createBoundaryRegistry()
    const dispatchSync = (_message: unknown): void => {}
    const dispatchService = Dispatch.of({
      dispatchAsync: () =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Promise.resolve() as unknown as ReturnType<
          typeof Dispatch.Service.dispatchAsync
        >,
      dispatchSync,
    })
    const context = Context.make(Dispatch, dispatchService).pipe(
      Context.add(Mount.MountTracker, {
        started: () => {},
        ended: () => {},
      }),
    )
    setRuntime(dispatchSync, context, registry)
    beginRender(registry)

    try {
      renderBlock(
        {
          slotId: 'default-inputs',
          model: HomeModel.make({ status: 'Idle', joinedCount: 0 }),
          view: homeViewWithDefaultInputs,
          viewInputs: { label: 'Explicit' },
          toParentMessage: message => message,
        },
        __htmlBuilder(),
      )
      renderBlock(
        {
          slotId: 'rest-inputs',
          model: HomeModel.make({ status: 'Idle', joinedCount: 0 }),
          view: homeRestTupleView,
          viewInputs: { label: 'Rest' },
          toParentMessage: message => message,
        },
        __htmlBuilder(),
      )
    } finally {
      clearRuntime()
    }

    expect(homeViewWithDefaultInputs.length).toBe(0)
    expect(homeRestTupleView.length).toBe(0)
    expect(renderedHomeLabel).toBe('Explicit')
    expectTypeOf(homeOptionalInputsView).parameters.toEqualTypeOf<
      [HomeModel, HomeViewInputs | undefined, HtmlBuilder<HomeMessage>]
    >()
  })

  it('keeps distinct same-ID owners separated by explicit placements', () => {
    const FirstOwner = define('AuthoringCollision')
    const SecondOwner = define('AuthoringCollision')
    const first = bindLeaf(makeLeaf(FirstOwner, Layer.empty), 'first')
    const second = bindLeaf(makeLeaf(SecondOwner, Layer.empty), 'second')
    const ParentOwner = define('AuthoringCollisionParent')

    const base = ParentOwner.define({
      Model: LeafParentModel,
      Message: LeafMessage,
    })
    const definition = base.makeComposition({
      childBindings: [first, second],
    })

    expect(
      definition.childBindings.map(childBinding => childBinding.placement),
    ).toEqual(['first', 'second'])
  })

  it('keeps different recipes for one owner isolated by placement', async () => {
    const RepeatedOwner = define('AuthoringRepeated')
    let firstBuilds = 0
    let secondBuilds = 0
    const first = bindLeaf(
      makeLeaf(
        RepeatedOwner,
        Layer.suspend(() => {
          firstBuilds += 1
          return Layer.empty
        }),
      ),
      'first',
    )
    const second = bindLeaf(
      makeLeaf(
        RepeatedOwner,
        Layer.suspend(() => {
          secondBuilds += 1
          return Layer.empty
        }),
      ),
      'second',
    )
    const ParentOwner = define('AuthoringRepeatedParent')
    const base = ParentOwner.define({
      Model: LeafParentModel,
      Message: LeafMessage,
    })
    const definition = base.makeComposition({
      childBindings: [first, second],
    })
    const parent = definition.makeBlock({
      init: () => ({
        model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
      }),
      update: (model, _message) => ({ model }),
      EffectsLayer: Layer.empty,
    })

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer)))

    expect(firstBuilds).toBe(1)
    expect(secondBuilds).toBe(1)
  })

  it('builds one reused block recipe once across placements', async () => {
    const RepeatedOwner = define('AuthoringShared')
    let builds = 0
    const Shared = makeLeaf(
      RepeatedOwner,
      Layer.suspend(() => {
        builds += 1
        return Layer.empty
      }),
    )
    const first = bindLeaf(Shared, 'first')
    const second = bindLeaf(Shared, 'second')
    const ParentOwner = define('AuthoringSharedParent')

    const base = ParentOwner.define({
      Model: LeafParentModel,
      Message: LeafMessage,
    })
    const definition = base.makeComposition({
      childBindings: [first, second],
    })
    const parent = definition.makeBlock({
      init: () => ({
        model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
      }),
      update: (model, _message) => ({ model }),
      EffectsLayer: Layer.empty,
    })

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer)))

    expect(builds).toBe(1)
  })

  it('allows named refinements that select the same provider recipe', () => {
    const RefinedOwner = define('AuthoringRefined')
    const EffectsLayer = Layer.suspend(() => Layer.empty)
    const first = bindLeaf(makeLeaf(RefinedOwner, EffectsLayer), 'first')
    const second = bindLeaf(makeLeaf(RefinedOwner, EffectsLayer), 'second')
    const ParentOwner = define('AuthoringRefinedParent')

    expect(() =>
      ParentOwner.define({
        Model: LeafParentModel,
        Message: LeafMessage,
      }).makeComposition({
        childBindings: [first, second],
      }),
    ).not.toThrow()
  })

  it('credits a bound child Layer in the selected parent graph', () => {
    expect(GraphParent.childBindings).toEqual([GraphChildBinding])
    expect(GraphParent.EffectsLayer).not.toBe(Layer.empty)
    expectTypeOf<
      RequirementsOfBlock<typeof GraphParent>
    >().toEqualTypeOf<never>()
  })

  it('keeps policy Command requirements from a bound child named Step', () => {
    expect(PolicyParent.childBindings).toEqual([ChoiceWithPolicyCommandBinding])
    expect(PolicyParent.hostHandlers).toEqual([CreateRoom])
  })

  it('scopes a foreign handler explicitly supplied by the host', async () => {
    const Binding = PolicyBindingParent.bindChild(
      PolicyParentWithHostProvider,
      {
        fromParentMessage: false,
        placement: 'Policy',
        read: (model: PolicyParentModel) => Option.some(model),
        write: (_model, nextModel) => nextModel,
        toParentMessage: (message: HomeMessage) => message,
      },
    )
    const composition = PolicyBindingParent.makeComposition({
      childBindings: [Binding],
    })
    const foldPolicy = composition.makeUpdate((model, message) =>
      Binding.fold(model, message),
    )
    const model = PolicyParentWithHostProvider.init().model
    const policyUpdate = foldPolicy(model, HomeMessage.ClickedCreateRoom())

    const messages = await Effect.runPromise(
      Effect.scoped(
        Effect.forEach(policyUpdate.commands ?? [], command =>
          Effect.provide(command.effect, inspectBinding(Binding).EffectsLayer),
        ),
      ),
    )

    expect(messages).toEqual([
      HomeMessage.CompletedCreateRoom({ roomId: 'provided' }),
    ])
  })

  it('retains explicit host provenance through root lowering and recipe selection', async () => {
    const model = PolicyParentWithSelectedHostProvider.init().model
    const lowered = lowerBlock(PolicyParentWithSelectedHostProvider)
    const policyUpdate: Update.Return<PolicyParentModel, HomeMessage> =
      lowered.update(model, HomeMessage.ClickedCreateRoom())
    const layer = qualifyLayer(
      PolicyParentWithSelectedHostProvider.owner.id,
      PolicyParentWithSelectedHostProvider.EffectsLayer,
    )

    const messages = await Effect.runPromise(
      Effect.scoped(
        Effect.forEach(policyUpdate.commands ?? [], command =>
          Effect.provide(command.effect, layer),
        ),
      ),
    )

    expect(messages).toEqual([
      HomeMessage.CompletedCreateRoom({ roomId: 'selected' }),
    ])
  })

  it('retains explicit host provenance for keyed bindings', async () => {
    const model = PolicyParentWithHostProvider.init().model
    const Binding = PolicyKeyedParent.bindChild(PolicyParentWithHostProvider, {
      fromParentMessage: false,
      placement: 'Policies',
      readAll: (models: ReadonlyArray<PolicyParentModel>) => models,
      key: (): 'only' => 'only',
      read: (item: PolicyParentModel) => item,
      writeAt: (
        _models: ReadonlyArray<PolicyParentModel>,
        _key: 'only',
        nextModel: PolicyParentModel,
      ) => [nextModel],
      toParentMessage: (_key: 'only', message: HomeMessage) => message,
    })
    const composition = PolicyKeyedParent.makeComposition({
      childBindings: [Binding],
    })
    const foldPolicy = composition.makeUpdate((models, message, key: 'only') =>
      Binding.fold(models, key, message),
    )
    const policyUpdate = foldPolicy(
      [model],
      HomeMessage.ClickedCreateRoom(),
      'only',
    )

    const messages = await Effect.runPromise(
      Effect.scoped(
        Effect.forEach(policyUpdate.commands ?? [], command =>
          Effect.provide(command.effect, inspectBinding(Binding).EffectsLayer),
        ),
      ),
    )

    expect(messages).toEqual([
      HomeMessage.CompletedCreateRoom({ roomId: 'provided' }),
    ])
  })

  it('rejects a child handler in its parent local recipe', async () => {
    const parent = graphParentComposition.makeBlock({
      ...graphParentImplementation,
      EffectsLayer: RunChildWork.layer,
    })

    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer))),
    ).rejects.toThrow('local EffectsLayer provides the child handler')
  })

  it('rejects a mismatched explicit host provider identity', async () => {
    const OtherRoom = define('AuthoringRoom')
    const OtherLoadRoom = OtherRoom.command('LoadRoom', {
      args: { roomId: Schema.String },
      messages: [RoomMessage.CompletedLoadRoom],
      handler: function* () {
        return () => Effect.succeed(RoomMessage.CompletedLoadRoom())
      },
    })
    const room = Room.provideHandlers(OtherLoadRoom.layer)

    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(room.EffectsLayer))),
    ).rejects.toThrow('belongs to a different definition')
  })
})
