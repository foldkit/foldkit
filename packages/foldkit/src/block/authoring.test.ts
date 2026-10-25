import { Context, Effect, Layer, Option, Schema, Stream, Tuple } from 'effect'
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
import { Dispatch } from '../runtime/index.js'
import * as Program from '../runtime/programPublic.js'
import { modifyFields } from '../struct/index.js'
import type * as Subscription from '../subscription/subscription.js'
import type * as Update from '../update/index.js'
import { bind, inspectBinding } from './binding.js'
import { defaultViewOf } from './defaultView.js'
import { type Namespace, makeDefinition, makeNamespace } from './define.js'
import { LocalEffectsLayerTypeId } from './definition.js'
import { lowerBlock } from './lowering.js'
import type { OwnedName } from './ownerName.js'
import * as Block from './public.js'
import type { Implementation } from './public.js'
import type {
  OperationRequirementsOfBlock,
  RequirementsOfBlock,
} from './requirements.js'
import { type Scoped, qualifyLayer } from './scope.js'

const HomeNamespace = makeNamespace('AuthoringHome')

const HomeModel = Schema.Struct({
  status: Schema.Literals(['Idle', 'Creating']),
  joinedCount: Schema.Number,
})
type HomeModel = typeof HomeModel.Type

const HomeMessage = defineMessageUnion({
  RequestedBoot: {},
  RequestedInformJoined: { joinedCount: Schema.Number },
  ClickedCreateRoom: {},
  CompletedCreateRoom: { roomId: Schema.String },
})
type HomeMessage = typeof HomeMessage.Type

const HomeOutMessage = defineMessageUnion({
  CreatedRoom: { roomId: Schema.String },
})
type HomeOutMessage = typeof HomeOutMessage.Type

let createRoomHandlerBuilds = 0

const CreateRoom = HomeNamespace.makeCommand('CreateRoom', {
  messages: [HomeMessage.CompletedCreateRoom],
  handler: function* () {
    createRoomHandlerBuilds += 1
    return () =>
      Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'room-1' }))
  },
})

const SaveRoom = HomeNamespace.makeCommand('SaveRoom', {
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

const HomeDefinition = HomeNamespace.makeDefinition({
  Model: HomeModel,
  Message: HomeMessage,
  OutMessage: HomeOutMessage,
})

const ObserveRooms = HomeNamespace.makeMountStream('ObserveRooms', {
  args: { roomId: Schema.String },
  messages: [HomeMessage.CompletedCreateRoom],
  handler: function* () {
    return ({ roomId }) =>
      Stream.succeed(HomeMessage.CompletedCreateRoom({ roomId }))
  },
})

const SelectedRoom = HomeNamespace.makeResource<string>()('SelectedRoom')

const roomMessageSchemas: [typeof HomeMessage.CompletedCreateRoom] = [
  HomeMessage.CompletedCreateRoom,
]

const homeSubscriptions = HomeDefinition.makeSubscriptions(entry => ({
  rooms: entry(
    'Rooms',
    { joinedCount: Schema.Number },
    {
      messages: roomMessageSchemas,
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

const homeManagedResources = HomeDefinition.makeManagedResources(entry => ({
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

const HomeComposition = HomeDefinition.makeComposition()

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

const homeBoot = HomeDefinition.makeStep(model => ({
  model,
  commands: [CreateRoom()],
}))

const homeInformJoined = HomeDefinition.makeStep(
  (model, joinedCount: number) => ({
    model: modifyFields(model, { joinedCount: () => joinedCount }),
  }),
)

const homeUpdate = HomeComposition.makeUpdate({
  RequestedBoot: model => homeBoot(model),
  RequestedInformJoined: (model, { joinedCount }) =>
    homeInformJoined(model, joinedCount),
  ClickedCreateRoom: model => ({
    model: modifyFields(model, { status: () => 'Creating' }),
    commands: [CreateRoom()],
  }),
  CompletedCreateRoom: (model, { roomId }) => ({
    model: modifyFields(model, { status: () => 'Idle' }),
    outMessage: HomeOutMessage.CreatedRoom({ roomId }),
  }),
})

const prepareHome = () =>
  HomeComposition.prepareBlock({
    view: homeView,
    init: homeInit,
    update: homeUpdate,
    operations: {
      boot: () => Tuple.make(HomeMessage.RequestedBoot()),
      informJoined: (joinedCount: number) =>
        Tuple.make(HomeMessage.RequestedInformJoined({ joinedCount })),
    },
    EffectsLayer: CreateRoom.layer,
  })
const Home: Block.FromAssemblyWithViewAndOutMessage<
  typeof HomeModel,
  typeof prepareHome
> = Block.assemble(prepareHome)

const NoMessageNamespace = makeNamespace('AuthoringNoMessage')

const NoMessageComposition = NoMessageNamespace.makeDefinition({
  Model: Schema.Null,
  Message: Schema.Never,
}).makeComposition()
const noMessageUpdate = NoMessageComposition.makeUpdate({})
const prepareNoMessage = () =>
  NoMessageComposition.prepareBlock({
    init: () => ({ model: null }),
    update: noMessageUpdate,
    view: NoMessageComposition.makeView((_model, h) => ({
      title: 'No Messages',
      body: h.empty,
    })),
  })
const NoMessage: Block.FromAssemblyWithView<
  typeof Schema.Null,
  typeof prepareNoMessage
> = Block.assemble(prepareNoMessage)

type GenericAuthoringViewInputs<Item, Value> = Readonly<{
  itemToValue: [Item] extends [Value]
    ? ((item: Item) => Value) | undefined
    : (item: Item) => Value
}>

const makeGenericAuthoring = <const Id extends string, Item, Value>(id: Id) => {
  const GenericNamespace = makeNamespace(id)
  const GenericModel = Schema.Struct({ value: Schema.String })
  const GenericMessage = defineMessageUnion({
    RequestedText: { value: Schema.String },
    RequestedCount: { value: Schema.Number },
    CompletedGeneric: {},
  })

  const RequestText = GenericNamespace.makeCommand('RequestText', {
    args: { value: Schema.String },
    messages: [GenericMessage.CompletedGeneric],
    handler: function* () {
      return () => Effect.succeed(GenericMessage.CompletedGeneric())
    },
  })
  const RequestCount = GenericNamespace.makeCommand('RequestCount', {
    args: { value: Schema.Number },
    messages: [GenericMessage.CompletedGeneric],
    handler: function* () {
      return () => Effect.succeed(GenericMessage.CompletedGeneric())
    },
  })

  const composition = GenericNamespace.makeDefinition({
    Model: GenericModel,
    Message: GenericMessage,
  }).makeComposition()
  const view = composition.makeView.withInputs<
    GenericAuthoringViewInputs<Item, Value>
  >((model, _viewInputs, h) => h.div([], [model.value]))

  const prepare = () =>
    composition.prepareBlock({
      view,
      init: () => ({ model: GenericModel.make({ value: '' }) }),
      update: composition.makeUpdate({
        RequestedText: (model, { value }) => ({
          model,
          commands: [RequestText({ value })],
        }),
        RequestedCount: (model, { value }) => ({
          model,
          commands: [RequestCount({ value })],
        }),
        CompletedGeneric: model => ({ model }),
      }),
      EffectsLayer: Layer.merge(RequestText.layer, RequestCount.layer),
    })
  const completedBlock: Block.FromAssemblyWithView<
    typeof GenericModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
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
const prepareHomeWithCheckedImplementation = () =>
  HomeComposition.prepareBlock(homeImplementation)
const HomeWithCheckedImplementation: Block.FromAssemblyWithOutMessage<
  typeof HomeModel,
  typeof prepareHomeWithCheckedImplementation
> = Block.assemble(prepareHomeWithCheckedImplementation)

const RoomNamespace = makeNamespace('AuthoringRoom')

const RoomModel = Schema.Struct({
  roomId: Schema.String,
  joinedCount: Schema.Number,
})
type RoomModel = typeof RoomModel.Type

const RoomMessage = defineMessageUnion({
  RequestedInformJoined: {
    joinedCount: Schema.Number,
    source: Schema.optionalKey(Schema.Literals(['Lobby', 'Game'])),
  },
  ClickedRefreshRoom: {},
  CompletedLoadRoom: {},
})
type RoomMessage = typeof RoomMessage.Type

const LoadRoom = RoomNamespace.makeCommand('LoadRoom', {
  args: { roomId: Schema.String },
  messages: [RoomMessage.CompletedLoadRoom],
})

const RoomDefinition = RoomNamespace.makeDefinition({
  Model: RoomModel,
  Message: RoomMessage,
})

const RoomComposition = RoomDefinition.makeComposition()
const roomInformJoined = RoomDefinition.makeStep(
  (model, joinedCount: number, source?: 'Lobby' | 'Game') => ({
    model: modifyFields(model, {
      joinedCount: () => joinedCount + (source === 'Game' ? 1 : 0),
    }),
  }),
)
const roomUpdate = RoomComposition.makeUpdate.withContext(
  (source: 'Reconnect' | 'Route', retryCount?: number) => ({
    RequestedInformJoined: (model, { joinedCount, source }) =>
      roomInformJoined(model, joinedCount, source),
    ClickedRefreshRoom: model => ({
      model,
      commands: [LoadRoom({ roomId: model.roomId })],
    }),
    CompletedLoadRoom: model => ({
      model: modifyFields(model, {
        joinedCount: joinedCount =>
          joinedCount + (source === 'Reconnect' ? (retryCount ?? 1) : 1),
      }),
    }),
  }),
)

const prepareRoom = () =>
  RoomComposition.prepareBlock({
    init: (roomId: string) => ({
      model: RoomModel.make({ roomId, joinedCount: 0 }),
    }),
    update: roomUpdate,
    operations: {
      informJoined: (joinedCount: number, source?: 'Lobby' | 'Game') =>
        Tuple.make(
          RoomMessage.RequestedInformJoined(
            source === undefined ? { joinedCount } : { joinedCount, source },
          ),
          'Route',
        ),
    },
    EffectsLayer: Layer.empty,
    hostHandlers: [LoadRoom],
  })
const Room: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RoomModel,
  typeof prepareRoom
> = Block.assemble(prepareRoom)

const RoomWithHostProvider = Room.provideHandlers(
  LoadRoom.toLayer(
    Effect.succeed(() => Effect.succeed(RoomMessage.CompletedLoadRoom())),
  ),
)

const ChoiceNamespace = makeNamespace('AuthoringChoice')

const CompletedObserveChoice = Schema.TaggedStruct('CompletedObserveChoice', {})

const ObserveChoice = ChoiceNamespace.makeMount('ObserveChoice', {
  messages: [CompletedObserveChoice],
})

const ChoiceEffectsLayer = Layer.empty

const makeChoice = <Value extends string>(Value: Schema.Schema<Value>) => {
  const Model = Schema.Struct({ value: Value })
  const SelectedChoice = Schema.TaggedStruct('SelectedChoice', { value: Value })
  const RequestedFinish = Schema.TaggedStruct('RequestedFinish', {
    value: Value,
  })
  const Message = Schema.Union([
    RequestedFinish,
    SelectedChoice,
    CompletedObserveChoice,
  ])
  const OutMessage = Schema.TaggedStruct('SelectedChoice', { value: Value })

  const BaseDefinition = ChoiceNamespace.makeDefinition({
    Model,
    Message,
    OutMessage,
  })
  const composition = BaseDefinition.makeComposition({
    mounts: [ObserveChoice],
  })

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

  const finish = BaseDefinition.makeStep((_model, value: Value) => ({
    model: Model.make({ value }),
    outMessage: OutMessage.make({ value }),
  }))

  const update = composition.makeUpdate({
    RequestedFinish: (model, { value }) => finish(model, value),
    SelectedChoice: (_model, { value }) => ({
      model: Model.make({ value }),
      outMessage: OutMessage.make({ value }),
    }),
    CompletedObserveChoice: model => ({ model }),
  })

  const prepare = () =>
    composition.prepareBlock({
      view,
      init: (value: Value) => ({ model: Model.make({ value }) }),
      update,
      operations: {
        finish: (value: Value) => Tuple.make(RequestedFinish.make({ value })),
      },
      EffectsLayer: ChoiceEffectsLayer,
      hostHandlers: [ObserveChoice],
    })
  const completedBlock: Block.FromAssemblyWithViewAndOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
}

const StringChoice = makeChoice(Schema.Literals(['One', 'Two']))

const LeafModel = Schema.Struct({ value: Schema.String })

const LeafMessage = defineMessageUnion({
  UpdatedLeaf: { value: Schema.String },
})
type LeafMessage = typeof LeafMessage.Type

const makeLeaf = <const Id extends string>(
  LeafNamespace: Namespace<Id>,
  EffectsLayer: Layer.Layer<never, never, never>,
) => {
  const composition = LeafNamespace.makeDefinition({
    Model: LeafModel,
    Message: LeafMessage,
  }).makeComposition()
  const prepare = () =>
    composition.prepareBlock({
      init: () => ({ model: LeafModel.make({ value: '' }) }),
      update: composition.makeUpdate({
        UpdatedLeaf: model => ({ model }),
      }),
      EffectsLayer,
    })
  const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof LeafModel,
    typeof prepare
  > = Block.assemble(prepare)
  return completedBlock
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

const GraphChildNamespace = makeNamespace('AuthoringGraphChild')

const GraphChildModel = Schema.Struct({ count: Schema.Number })

const GraphChildMessage = defineMessageUnion({
  RequestedChildWork: {},
  CompletedChildWork: {},
})

const RunChildWork = GraphChildNamespace.makeCommand('RunChildWork', {
  messages: [GraphChildMessage.CompletedChildWork],
  handler: function* () {
    return () => Effect.succeed(GraphChildMessage.CompletedChildWork())
  },
})

const graphChildComposition = GraphChildNamespace.makeDefinition({
  Model: GraphChildModel,
  Message: GraphChildMessage,
}).makeComposition()
const graphChildImplementation = {
  init: () => ({ model: GraphChildModel.make({ count: 0 }) }),
  update: graphChildComposition.makeUpdate({
    RequestedChildWork: model => ({ model, commands: [RunChildWork()] }),
    CompletedChildWork: model => ({ model }),
  }),
  EffectsLayer: RunChildWork.layer,
}

const prepareGraphChildBlock = () =>
  graphChildComposition.prepareBlock(graphChildImplementation)
const GraphChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof GraphChildModel,
  typeof prepareGraphChildBlock
> = Block.assemble(prepareGraphChildBlock)

const GraphParentNamespace = makeNamespace('AuthoringGraphParent')

const GraphParentModel = Schema.Struct({ child: GraphChildModel })
type GraphParentModel = typeof GraphParentModel.Type

const GraphParentMessage = defineMessageUnion({
  RequestedParentWork: {},
  CompletedParentWork: {},
})

const RunParentWork = GraphParentNamespace.makeCommand('RunParentWork', {
  messages: [GraphParentMessage.CompletedParentWork],
})

const GraphParentBaseDefinition = GraphParentNamespace.makeDefinition({
  Model: GraphParentModel,
  Message: GraphParentMessage,
})
const GraphChildBinding = GraphParentBaseDefinition.makeBinding(
  GraphChildBlock,
  {
    placement: 'child',
    read: (model: GraphParentModel) => Option.some(model.child),
    write: (model, child) => ({ ...model, child }),
  },
)

const graphParentComposition = GraphParentBaseDefinition.makeComposition({
  bindings: [GraphChildBinding],
})

const graphParentUpdateHandlers = {
  RequestedParentWork: (model: GraphParentModel) => ({ model }),
  CompletedParentWork: (model: GraphParentModel) => ({ model }),
}

const graphParentImplementation = {
  init: () => ({
    model: GraphParentModel.make({
      child: GraphChildModel.make({ count: 0 }),
    }),
  }),
  update: graphParentComposition.makeUpdate(graphParentUpdateHandlers),
  EffectsLayer: Layer.empty,
}

const prepareGraphParent = () =>
  graphParentComposition.prepareBlock(graphParentImplementation)
const GraphParent: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof GraphParentModel,
  typeof prepareGraphParent
> = Block.assemble(prepareGraphParent)

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
const SelectedGraphParentBaseDefinition = makeNamespace(
  'AuthoringSelectedGraphParent',
).makeDefinition({
  Model: GraphParentModel,
  Message: GraphParentMessage,
})
const SelectedGraphChildBinding = SelectedGraphParentBaseDefinition.makeBinding(
  SelectedGraphChild,
  {
    placement: 'selected-child',
    read: (model: GraphParentModel) => Option.some(model.child),
    write: (model, child) => ({ ...model, child }),
  },
)

const SelectedGraphParentComposition =
  SelectedGraphParentBaseDefinition.makeComposition({
    bindings: [SelectedGraphChildBinding],
  })
const prepare = () =>
  SelectedGraphParentComposition.prepareBlock({
    ...graphParentImplementation,
    update: SelectedGraphParentComposition.makeUpdate(
      graphParentUpdateHandlers,
    ),
  })
const completedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof GraphParentModel,
  typeof prepare
> = Block.assemble(prepare)
const SelectedGraphParent = completedBlock.replaceEffectsLayer(Layer.empty)

const SelectedGraphParentWithFailure = SelectedGraphParent.replaceEffectsLayer(
  Layer.effectDiscard(
    Effect.fail<'ParentProviderUnavailable'>('ParentProviderUnavailable'),
  ),
)

const PolicyParentNamespace = makeNamespace('AuthoringPolicyParent')

const PolicyParentModel = Schema.Struct({ choice: StringChoice.Model })
type PolicyParentModel = typeof PolicyParentModel.Type
const PolicyParentMessage = defineMessageUnion({
  ClickedCreateRoom: {},
  CompletedCreateRoom: { roomId: Schema.String },
})

const PolicyParentBaseDefinition = PolicyParentNamespace.makeDefinition({
  Model: PolicyParentModel,
  Message: PolicyParentMessage,
})
const ChoiceWithPolicyCommandBinding = PolicyParentBaseDefinition.makeBinding(
  StringChoice,
  {
    placement: 'choice',
    read: (model: PolicyParentModel) => Option.some(model.choice),
    write: (
      model: PolicyParentModel,
      choice: typeof StringChoice.Model.Type,
    ) => ({
      ...model,
      choice,
    }),
  },
).withOutMessagePolicy({
  fold: () => (model: PolicyParentModel) => ({
    model,
    commands: [CreateRoom()],
  }),
})

const policyParentComposition = PolicyParentBaseDefinition.makeComposition({
  bindings: [ChoiceWithPolicyCommandBinding],
})
const policyParentUpdate = policyParentComposition.makeUpdate({
  ClickedCreateRoom: model =>
    ChoiceWithPolicyCommandBinding.finish('Two')(model),
  CompletedCreateRoom: model =>
    PolicyParentBaseDefinition.makeNoopStep()(model),
})

const preparePolicyParent = () =>
  policyParentComposition.prepareBlock({
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
const PolicyParent: Block.FromAssemblyWithView<
  typeof PolicyParentModel,
  typeof preparePolicyParent
> = Block.assemble(preparePolicyParent)

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
const PolicyBindingParent = makeDefinition('AuthoringPolicyBindingParent', {
  Model: PolicyParentModel,
  Message: Schema.Never,
})
const PolicyKeyedParent = makeDefinition('AuthoringPolicyKeyedParent', {
  Model: Schema.Array(PolicyParentModel),
  Message: Schema.Never,
})

const PolicyConflictChildNamespace = makeNamespace(
  'AuthoringPolicyConflictChild',
)
const ForeignPolicyConflictChildNamespace = makeNamespace(
  'AuthoringPolicyConflictChild',
)
const PolicyConflictChildModel = Schema.Struct({ value: Schema.String })
const PolicyConflictChildMessage = defineMessageUnion({ CompletedRun: {} })
type PolicyConflictChildMessage = typeof PolicyConflictChildMessage.Type
const PolicyConflictChildOutMessage = defineMessageUnion({ RequestedRun: {} })
type PolicyConflictChildOutMessage = typeof PolicyConflictChildOutMessage.Type

const RunPolicyChild = PolicyConflictChildNamespace.makeCommand('Run', {
  args: { value: Schema.String },
  messages: [PolicyConflictChildMessage.CompletedRun],
  handler: function* () {
    return () => Effect.succeed(PolicyConflictChildMessage.CompletedRun())
  },
})

const ConflictingRunPolicyChild =
  ForeignPolicyConflictChildNamespace.makeCommand('Run', {
    args: { value: Schema.Number },
    messages: [PolicyConflictChildMessage.CompletedRun],
  })

const policyConflictChildComposition =
  PolicyConflictChildNamespace.makeDefinition({
    Model: PolicyConflictChildModel,
    Message: PolicyConflictChildMessage,
    OutMessage: PolicyConflictChildOutMessage,
  }).makeComposition()
const preparePolicyConflictChildBlock = () =>
  policyConflictChildComposition.prepareBlock({
    init: () => ({ model: PolicyConflictChildModel.make({ value: '' }) }),
    update: policyConflictChildComposition.makeUpdate({
      CompletedRun: (model, _message) => ({
        model,
        outMessage: PolicyConflictChildOutMessage.RequestedRun(),
      }),
    }),
    EffectsLayer: RunPolicyChild.layer,
  })
const PolicyConflictChildBlock: Block.FromAssemblyWithOutMessage<
  typeof PolicyConflictChildModel,
  typeof preparePolicyConflictChildBlock
> = Block.assemble(preparePolicyConflictChildBlock)

const PolicyConflictParentModel = Schema.Struct({
  child: PolicyConflictChildModel,
})
type PolicyConflictParentModel = typeof PolicyConflictParentModel.Type
const PolicyConflictParentMessage = defineMessageUnion({
  ClickedCreateRoom: {},
  CompletedCreateRoom: { roomId: Schema.String },
})

const PolicyConflictParentBaseDefinition = makeNamespace(
  'AuthoringPolicyConflictParent',
).makeDefinition({
  Model: PolicyConflictParentModel,
  Message: PolicyConflictParentMessage,
})
const PolicyConflictChildBinding =
  PolicyConflictParentBaseDefinition.makeBinding(PolicyConflictChildBlock, {
    placement: 'policy-conflict-child',
    read: (model: PolicyConflictParentModel) => Option.some(model.child),
    write: (model, child) => ({ ...model, child }),
  }).withOutMessagePolicy({
    fold:
      (
        _outMessage: PolicyConflictChildOutMessage,
        {
          liftCommand,
        }: Update.FoldContext<
          PolicyConflictChildMessage,
          typeof PolicyConflictParentMessage.Type
        >,
      ) =>
      (model: PolicyConflictParentModel) => ({
        model,
        commands: [liftCommand(ConflictingRunPolicyChild({ value: 1 }))],
      }),
  })
const policyConflictParentComposition =
  PolicyConflictParentBaseDefinition.makeComposition({
    bindings: [PolicyConflictChildBinding],
  })

if (false) {
  const ForeignOwnedMessage = defineMessageUnion({ CompletedForeign: {} })
  HomeDefinition.makeSubscriptions(entry => {
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

  const ForeignDefinition = makeNamespace('AuthoringForeign').makeDefinition({
    Model: HomeModel,
    Message: ForeignOwnedMessage,
  })
  const foreignSubscriptions = ForeignDefinition.makeSubscriptions(entry => ({
    foreign: entry('Foreign', {
      messages: [ForeignOwnedMessage.CompletedForeign],
    }),
  }))
  HomeDefinition.makeSubscriptions(() => ({
    // @ts-expect-error A foreign Subscription registry cannot bypass the owned builder.
    foreign: foreignSubscriptions.foreign,
  }))

  HomeDefinition.makeManagedResources(entry => ({
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
  const updateWithForwardedCommands = HomeComposition.makeUpdate.withContext(
    (shouldCreateRoom: boolean) => ({
      RequestedBoot: (model, _message) => ({
        model,
        commands: maybeCreateRoomCommands(shouldCreateRoom),
      }),
      RequestedInformJoined: (model, _message) => ({
        model,
        commands: maybeCreateRoomCommands(shouldCreateRoom),
      }),
      ClickedCreateRoom: (model, _message) => ({
        model,
        commands: maybeCreateRoomCommands(shouldCreateRoom),
      }),
      CompletedCreateRoom: (model, _message) => ({
        model,
        commands: maybeCreateRoomCommands(shouldCreateRoom),
      }),
    }),
  )
  const bootWithForwardedCommands = HomeDefinition.makeStep(
    (model, shouldCreateRoom: boolean) => ({
      model,
      commands: maybeCreateRoomCommands(shouldCreateRoom),
    }),
  )
  const prepareHomeWithForwardedCommands = () =>
    HomeComposition.prepareBlock({
      init: initWithForwardedCommands,
      update: updateWithForwardedCommands,
      operations: {
        boot: (shouldCreateRoom: boolean) =>
          Tuple.make(HomeMessage.RequestedBoot(), shouldCreateRoom),
      },
      EffectsLayer: CreateRoom.layer,
    })
  const HomeWithForwardedCommands: Block.FromAssemblyWithOutMessage<
    typeof HomeModel,
    typeof prepareHomeWithForwardedCommands
  > = Block.assemble(prepareHomeWithForwardedCommands)

  // @ts-expect-error An exposed operation cannot overwrite a Binding member.
  HomeComposition.prepareBlock({
    init: homeInit,
    update: homeUpdate,
    operations: { fold: () => Tuple.make(HomeMessage.RequestedBoot()) },
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
  expectTypeOf<
    Parameters<typeof HomeWithForwardedCommands.update>[2]
  >().toEqualTypeOf<boolean>()
  expectTypeOf(HomeWithForwardedCommands.operations.boot)
    .parameter(1)
    .toEqualTypeOf<boolean>()

  // @ts-expect-error Omitting EffectsLayer still rejects unresolved local handlers.
  HomeComposition.prepareBlock({
    init: homeInit,
    update: homeUpdate,
  })

  const erasedImplementation: Implementation<
    HomeModel,
    HomeMessage,
    HomeOutMessage
  > = homeImplementation
  const erasedBlock = HomeComposition.prepareBlock(erasedImplementation)
  // @ts-expect-error A broad annotation cannot produce a usable block.
  erasedBlock.init

  // @ts-expect-error A broad annotation cannot produce a usable Program root.
  Program.makeElement({
    block: erasedBlock,
    container: null,
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

  const ConflictingCreateRoom = HomeNamespace.makeCommand('CreateRoom', {
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

  const CrossKindNamespace = makeNamespace('AuthoringCrossKind')
  const CommandFocus = CrossKindNamespace.makeCommand('Focus', {
    messages: [HomeMessage.CompletedCreateRoom],
  })
  const MountFocus = CrossKindNamespace.makeMount('Focus', {
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(HomeMessage.CompletedCreateRoom({ roomId: 'focused' }))
    },
  })

  const crossKindComposition = CrossKindNamespace.makeDefinition({
    Model: HomeModel,
    Message: HomeMessage,
  }).makeComposition({
    mounts: [MountFocus],
  })
  // @ts-expect-error A same-name Mount handler cannot satisfy a Command contract.
  crossKindComposition.prepareBlock({
    init: homeInit,
    update: model => ({ model, commands: [CommandFocus()] }),
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
  makeNamespace('').makeDefinition
  // @ts-expect-error Block IDs with path separators cannot create authoring definitions.
  makeNamespace('Authoring/Invalid').makeDefinition
  // @ts-expect-error Block IDs cannot introduce a scoped identity separator.
  makeNamespace('Authoring::Invalid').makeDefinition
  // @ts-expect-error Typed Block IDs cannot introduce a scoped identity separator.
  makeDefinition('Authoring::Invalid', {
    Model: HomeModel,
    Message: HomeMessage,
  })
  // @ts-expect-error Local definition names cannot introduce a scoped identity separator.
  HomeNamespace.makeCommand('Nested::CreateRoom', {
    messages: [HomeMessage.CompletedCreateRoom],
  })
  // @ts-expect-error Local definition names cannot introduce another namespace.
  HomeNamespace.makeCommand('Nested/CreateRoom', {
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

  const ObserveHomeView = HomeNamespace.makeMount('ObserveHomeView', {
    messages: [HomeMessage.CompletedCreateRoom],
    handler: function* () {
      return () =>
        Effect.succeed(
          HomeMessage.CompletedCreateRoom({ roomId: 'mounted-room' }),
        )
    },
  })
  const ObserveSecondaryHomeView = HomeNamespace.makeMount(
    'ObserveSecondaryHomeView',
    {
      messages: [HomeMessage.CompletedCreateRoom],
      handler: function* () {
        return () =>
          Effect.succeed(
            HomeMessage.CompletedCreateRoom({ roomId: 'secondary-room' }),
          )
      },
    },
  )

  const subsetHomeViewComposition = HomeNamespace.makeDefinition({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  }).makeComposition({
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

  const supersetHomeViewComposition = HomeNamespace.makeDefinition({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  }).makeComposition({
    mounts: [ObserveHomeView, ObserveSecondaryHomeView],
  })
  supersetHomeViewComposition.prepareBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: subsetHomeView,
    EffectsLayer: Layer.merge(
      ObserveHomeView.layer,
      ObserveSecondaryHomeView.layer,
    ),
  })

  const ForeignHomeNamespace = makeNamespace('AuthoringForeignHomeView')

  const foreignHomeComposition = ForeignHomeNamespace.makeDefinition({
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  }).makeComposition()
  const foreignHomeView = foreignHomeComposition.makeView((_model, h) =>
    h.div([]),
  )
  // @ts-expect-error A completed Block must use a view authored by its own definition.
  HomeComposition.prepareBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: foreignHomeView,
    EffectsLayer: Layer.empty,
  })

  const sameOwnerDifferentComposition = HomeNamespace.makeDefinition({
    Model: RoomModel,
    Message: RoomMessage,
  }).makeComposition()
  const sameOwnerDifferentView = sameOwnerDifferentComposition.makeView(
    (_model, h) => h.div([]),
  )
  // @ts-expect-error Owner identity cannot substitute for the definition's Model and Message view channels.
  HomeComposition.prepareBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: sameOwnerDifferentView,
    EffectsLayer: Layer.empty,
  })

  const erasedHomeView: any = homeView
  // @ts-expect-error any cannot erase an implementation's authored view contract.
  HomeComposition.prepareBlock({
    init: homeInit,
    update: (model, _message) => ({ model }),
    view: erasedHomeView,
    EffectsLayer: Layer.empty,
  })

  HomeComposition.prepareBlock({
    // @ts-expect-error Specialized implementation shapes retain the definition Model returned by init.
    init: () => ({
      model: RoomModel.make({ roomId: 'foreign', joinedCount: 0 }),
    }),
    // @ts-expect-error Specialized implementation shapes retain the definition Model and Message accepted by update.
    update: (model: RoomModel, _message: RoomMessage) => ({ model }),
    view: homeView,
    EffectsLayer: Layer.empty,
  })

  HomeComposition.prepareBlock({
    // @ts-expect-error Specialized implementations with Subscriptions retain the definition Model returned by init.
    init: () => ({
      model: RoomModel.make({ roomId: 'foreign', joinedCount: 0 }),
    }),
    // @ts-expect-error Specialized implementations with Subscriptions retain the definition Model and Message accepted by update.
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

    const OmittedChoiceBinding = PolicyParentBaseDefinition.makeBinding(
      StringChoice,
      {
        placement: 'omitted-compact-evidence',
        read: (parentModel: PolicyParentModel) =>
          Option.some(parentModel.choice),
        write: (
          parentModel: PolicyParentModel,
          choice: typeof StringChoice.Model.Type,
        ) => ({ ...parentModel, choice }),
      },
    ).withOutMessagePolicy({
      fold: () => (parentModel: PolicyParentModel) => ({
        model: parentModel,
      }),
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

  const homeNoop = HomeDefinition.makeNoopStep()
  HomeComposition.makeUpdate({
    // @ts-expect-error Updates use the Model fixed by the Block definition.
    RequestedBoot: (model: RoomModel) => ({ model }),
    RequestedInformJoined: homeNoop,
    ClickedCreateRoom: homeNoop,
    CompletedCreateRoom: homeNoop,
  })

  const roomNoop = RoomDefinition.makeNoopStep()
  RoomComposition.makeUpdate({
    // @ts-expect-error A Block without OutMessage cannot emit one.
    RequestedInformJoined: (model, _message) => ({
      model,
      outMessage: HomeOutMessage.CreatedRoom({ roomId: model.roomId }),
    }),
    ClickedRefreshRoom: roomNoop,
    CompletedLoadRoom: roomNoop,
  })

  HomeComposition.makeUpdate.withContext(context => ({
    RequestedBoot: (model, _message) => {
      // @ts-expect-error Extra update context requires an explicit type annotation.
      context.nonexistent
      return { model }
    },
    RequestedInformJoined: (model, _message) => {
      // @ts-expect-error Extra update context requires an explicit type annotation.
      context.nonexistent
      return { model }
    },
    ClickedCreateRoom: (model, _message) => {
      // @ts-expect-error Extra update context requires an explicit type annotation.
      context.nonexistent
      return { model }
    },
    CompletedCreateRoom: (model, _message) => {
      // @ts-expect-error Extra update context requires an explicit type annotation.
      context.nonexistent
      return { model }
    },
  }))

  HomeDefinition.makeStep((model, input) => {
    // @ts-expect-error Extra Step input requires an explicit type annotation.
    input.nonexistent
    return { model }
  })

  RoomComposition.prepareBlock({
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
    operations: {
      // @ts-expect-error Inline exposed operation inputs require explicit annotations.
      inspect: input => {
        input.nonexistent
        return Tuple.make(RoomMessage.ClickedRefreshRoom())
      },
    },
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error Explicit any context erases the operation contract.
  HomeDefinition.makeStep((model, _input: any) => ({ model }))

  // @ts-expect-error Explicit any context erases the operation contract.
  HomeComposition.makeUpdate.withContext((_context: any) => ({
    RequestedBoot: (model, _message) => ({ model }),
    RequestedInformJoined: (model, _message) => ({ model }),
    ClickedCreateRoom: (model, _message) => ({ model }),
    CompletedCreateRoom: (model, _message) => ({ model }),
  }))

  // @ts-expect-error A parent operation remains uncovered by a child-provided Layer.
  graphParentComposition.prepareBlock({
    init: GraphParent.init,
    update: model => ({
      model,
      commands: [RunParentWork()],
    }),
    EffectsLayer: Layer.empty,
  })

  const UnregisteredGraphParentDefinition = makeNamespace(
    'AuthoringUnregisteredGraphParent',
  ).makeDefinition({
    Model: GraphParentModel,
    Message: GraphParentMessage,
  })
  const UnregisteredGraphChildBinding =
    UnregisteredGraphParentDefinition.makeBinding(GraphChildBlock, {
      placement: 'unregistered-child',
      read: (model: GraphParentModel) => Option.some(model.child),
      write: (model, child) => ({ ...model, child }),
    })
  const RegisteredGraphChildBinding =
    UnregisteredGraphParentDefinition.makeBinding(GraphChildBlock, {
      placement: 'registered-child',
      read: (model: GraphParentModel) => Option.some(model.child),
      write: (model, child) => ({ ...model, child }),
    })
  const unregisteredGraphComposition =
    UnregisteredGraphParentDefinition.makeComposition({
      bindings: [RegisteredGraphChildBinding],
    })
  const unregisteredGraphUpdate = unregisteredGraphComposition.makeUpdate({
    RequestedParentWork: model =>
      UnregisteredGraphChildBinding.fold(
        // @ts-expect-error An unregistered Binding cannot fold a raw Model.
        model,
        GraphChildMessage.RequestedChildWork(),
      ),
    CompletedParentWork: model =>
      UnregisteredGraphParentDefinition.makeNoopStep()(model),
  })
  unregisteredGraphComposition.prepareBlock({
    // @ts-expect-error An unregistered Binding cannot contribute initialization.
    init: () =>
      UnregisteredGraphChildBinding.init({
        args: [],
        toParentModel: child => GraphParentModel.make({ child }),
      }),
    update: unregisteredGraphUpdate,
    EffectsLayer: Layer.empty,
  })
  // @ts-expect-error An unregistered Binding cannot satisfy implementation evidence.
  unregisteredGraphComposition.prepareBlock({
    init: () => ({
      model: GraphParentModel.make({
        child: GraphChildModel.make({ count: 0 }),
      }),
    }),
    update: unregisteredGraphUpdate,
    EffectsLayer: Layer.empty,
  })

  const policyConflictUpdate = policyConflictParentComposition.makeUpdate({
    ClickedCreateRoom: model => ({ model }),
    CompletedCreateRoom: model => ({ model }),
  })
  // @ts-expect-error A scoped policy Command must exactly match the registered child handler contract.
  policyConflictParentComposition.prepareBlock({
    init: () => ({
      model: PolicyConflictParentModel.make({
        child: PolicyConflictChildModel.make({ value: '' }),
      }),
    }),
    update: policyConflictUpdate,
    EffectsLayer: Layer.empty,
  })

  // @ts-expect-error A child named Step's OutMessage policy Command requires its matching host handler.
  policyParentComposition.prepareBlock({
    init: PolicyParent.init,
    update: PolicyParent.update,
    EffectsLayer: Layer.empty,
    hostHandlers: [ObserveChoice],
  })

  GraphParentNamespace.makeDefinition({
    Model: HomeModel,
    Message: GraphParentMessage,
  }).makeComposition(
    // @ts-expect-error Child bindings must use the definition's parent Model.
    {
      bindings: [GraphChildBinding],
    },
  )

  const ForeignCommandParentBaseDefinition =
    GraphParentNamespace.makeDefinition({
      Model: GraphParentModel,
      Message: GraphParentMessage,
    })
  const ForeignCommandBinding = ForeignCommandParentBaseDefinition.makeBinding(
    StringChoice,
    {
      placement: 'foreign-command-message',
      read: (_model: GraphParentModel) =>
        Option.some(StringChoice.Model.make({ value: 'One' })),
      write: (model: GraphParentModel) => model,
    },
  ).withOutMessagePolicy({
    fold: () => (model: GraphParentModel) => ({
      model,
      commands: [CreateRoom()],
    }),
  })
  // @ts-expect-error A child policy Command must produce this Composition's complete Message.
  ForeignCommandParentBaseDefinition.makeComposition({
    bindings: [ForeignCommandBinding],
  })

  const ParentOutMessage = defineMessageUnion({ AcceptedChildResult: {} })
  const ForeignForwardParentBaseDefinition =
    GraphParentNamespace.makeDefinition({
      Model: GraphParentModel,
      Message: GraphParentMessage,
      OutMessage: ParentOutMessage,
    })
  const ForeignForwardBinding = ForeignForwardParentBaseDefinition.makeBinding(
    StringChoice,
    {
      placement: 'foreign-forward',
      read: (_model: GraphParentModel) =>
        Option.some(StringChoice.Model.make({ value: 'One' })),
      write: (model: GraphParentModel) => model,
    },
  ).withOutMessagePolicy({
    forward: () => HomeOutMessage.CreatedRoom({ roomId: 'foreign' }),
  })
  // @ts-expect-error A child forward policy must produce the parent's OutMessage.
  ForeignForwardParentBaseDefinition.makeComposition({
    bindings: [ForeignForwardBinding],
  })
  const MissingForwardParentBaseDefinition =
    GraphParentNamespace.makeDefinition({
      Model: GraphParentModel,
      Message: GraphParentMessage,
    })
  MissingForwardParentBaseDefinition.makeBinding(StringChoice, {
    placement: 'missing-forward',
    read: (_model: GraphParentModel) =>
      Option.some(StringChoice.Model.make({ value: 'One' })),
    write: (model: GraphParentModel) => model,
  }).withOutMessagePolicy({
    // @ts-expect-error A parent Definition without OutMessages cannot forward a child OutMessage.
    forward: () => ParentOutMessage.AcceptedChildResult(),
  })

  const ForeignDerivedParentBaseDefinition =
    GraphParentNamespace.makeDefinition({
      Model: GraphParentModel,
      Message: GraphParentMessage,
      OutMessage: ParentOutMessage,
    })
  const ForeignDerivedBinding = ForeignDerivedParentBaseDefinition.makeBinding(
    StringChoice,
    {
      placement: 'foreign-derived-out-message',
      read: (_model: GraphParentModel) =>
        Option.some(StringChoice.Model.make({ value: 'One' })),
      write: (model: GraphParentModel) => model,
    },
  ).withOutMessagePolicy({
    fold: () => (model: GraphParentModel) => ({
      model,
      outMessage: HomeOutMessage.CreatedRoom({ roomId: 'foreign' }),
    }),
  })
  // @ts-expect-error A child fold policy must produce the parent's OutMessage.
  ForeignDerivedParentBaseDefinition.makeComposition({
    bindings: [ForeignDerivedBinding],
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
    expectTypeOf(HomeWithTestProvider.operations).toEqualTypeOf(Home.operations)
    expectTypeOf<
      RequirementsOfBlock<typeof HomeWithCheckedImplementation>
    >().toEqualTypeOf<never>()
    expectTypeOf(Room.replaceEffectsLayer(Layer.empty).update).toEqualTypeOf(
      Room.update,
    )
    expectTypeOf(
      StringChoice.replaceEffectsLayer(Layer.empty).operations.finish,
    ).toEqualTypeOf(StringChoice.operations.finish)

    expect(HomeWithTestProvider.Model).toBe(Home.Model)
    expect(HomeWithTestProvider.Message).toBe(Home.Message)
    expect(HomeWithTestProvider.OutMessage).toBe(Home.OutMessage)
    expect(HomeWithTestProvider.makeView).toBe(Home.makeView)
    expect(HomeWithTestProvider.init).toBe(Home.init)
    expect(HomeWithTestProvider.update).toBe(Home.update)
    expect(HomeWithTestProvider.operations).toBe(Home.operations)
    expect(HomeWithTestProvider.bindings).toBe(Home.bindings)
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
    const ParentNamespace = makeNamespace('AuthoringSelectedRecipe')
    const ChildNamespace = makeNamespace('AuthoringSelectedRecipeChild')
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
      makeLeaf(ChildNamespace, DefaultChildLayer).replaceEffectsLayer(
        SelectedChildLayer,
      ),
      'child',
    )

    const definition = ParentNamespace.makeDefinition({
      Model: LeafParentModel,
      Message: LeafMessage,
    }).makeComposition({
      bindings: [child],
    })
    const prepareBlock = () =>
      definition.prepareBlock({
        init: () => ({
          model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
        }),
        update: definition.makeUpdate({
          UpdatedLeaf: model => ({ model }),
        }),
        EffectsLayer: DefaultParentLayer,
      })
    const block: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof LeafParentModel,
      typeof prepareBlock
    > = Block.assemble(prepareBlock)
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
    expect(selected.bindings).toBe(block.bindings)

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(selected.EffectsLayer)))

    expect(defaultParentBuilds).toBe(0)
    expect(selectedParentBuilds).toBe(1)
    expect(defaultChildBuilds).toBe(0)
    expect(selectedChildBuilds).toBe(1)
  })

  it('builds differently selected occurrences independently at distinct placements', async () => {
    const RepeatedNamespace = makeNamespace('AuthoringSelectedConflict')
    let defaultBuilds = 0
    let selectedBuilds = 0
    const block = makeLeaf(
      RepeatedNamespace,
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
    const ParentNamespace = makeNamespace('AuthoringSelectedConflictParent')

    const definition = ParentNamespace.makeDefinition({
      Model: LeafParentModel,
      Message: LeafMessage,
    }).makeComposition({
      bindings: [bindLeaf(block, 'default'), bindLeaf(selected, 'selected')],
    })
    const prepareParent = () =>
      definition.prepareBlock({
        init: () => ({
          model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
        }),
        update: definition.makeUpdate({
          UpdatedLeaf: model => ({ model }),
        }),
        EffectsLayer: Layer.empty,
      })
    const parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof LeafParentModel,
      typeof prepareParent
    > = Block.assemble(prepareParent)

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

  it('preserves explicitly readonly owned Subscription Message schemas', () => {
    const messageSchemas: readonly [typeof HomeMessage.CompletedCreateRoom] = [
      HomeMessage.CompletedCreateRoom,
    ]
    const subscriptions = HomeDefinition.makeSubscriptions(entry => ({
      rooms: entry(
        'ReadonlyRooms',
        { joinedCount: Schema.Number },
        {
          messages: messageSchemas,
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

    expect(subscriptions.rooms.messages).toBe(messageSchemas)
    expectTypeOf(subscriptions.rooms.messages).toEqualTypeOf<
      readonly [typeof HomeMessage.CompletedCreateRoom]
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
    expect(() => makeNamespace(globalThis.String('Authoring/Invalid'))).toThrow(
      /ID must be non-empty/,
    )
    expect(() =>
      makeNamespace(globalThis.String('Authoring::Invalid')),
    ).toThrow(/ID must be non-empty/)
    expect(() =>
      HomeNamespace.makeCommand(globalThis.String('Nested::CreateRoom'), {
        messages: [HomeMessage.CompletedCreateRoom],
      }),
    ).toThrow(/primitive name must be non-empty/)
    expect(() =>
      HomeNamespace.makeCommand(globalThis.String('Nested/CreateRoom'), {
        messages: [HomeMessage.CompletedCreateRoom],
      }),
    ).toThrow(/primitive name must be non-empty/)
  })

  it('rejects dynamic exposed operation names that collide with Binding members', () => {
    const name: string = 'fold'

    expect(() =>
      HomeDefinition.makeComposition().prepareBlock({
        init: homeInit,
        update: homeUpdate,
        operations: { [name]: () => Tuple.make(HomeMessage.RequestedBoot()) },
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
    expect(Home.operations).toEqual({
      boot: expect.any(Function),
      informJoined: expect.any(Function),
    })
    expect(Home.operations.boot).not.toBe(homeBoot)
    expect(Home.operations.informJoined).not.toBe(homeInformJoined)
    expect(typeof HomeDefinition.makeComposition).toBe('function')
    expect(Home).not.toHaveProperty('connection')

    const homeInit_ = Home.init()

    expect(homeInit_.model).toEqual({ status: 'Idle', joinedCount: 0 })
    expect(homeInitCalls).toBe(1)
  })

  it('preserves update requirements, OutMessages, and contextual Step inputs', () => {
    const model = HomeModel.make({ status: 'Idle', joinedCount: 0 })
    const clickedCreateRoom = HomeMessage.ClickedCreateRoom()
    const startedCreate = Home.update(model, clickedCreateRoom)
    const curriedCreate = Home.update(clickedCreateRoom)(model)
    const informedJoined = Home.operations.informJoined(model, 3)

    expect(curriedCreate.model).toEqual(startedCreate.model)
    expect(curriedCreate.commands?.map(command => command.name)).toEqual(
      startedCreate.commands?.map(command => command.name),
    )
    expect(Home.update.length).toBe(2)
    expect(Home.update(clickedCreateRoom).length).toBe(1)
    expect(startedCreate.model.status).toBe('Creating')
    expect(startedCreate.commands?.map(command => command.name)).toEqual([
      'AuthoringHome/CreateRoom',
    ])
    expect(informedJoined.model.joinedCount).toBe(3)

    expectTypeOf<Parameters<typeof Home.update>>().toEqualTypeOf<
      [model: HomeModel, message: HomeMessage]
    >()
    expectTypeOf<ReturnType<typeof Home.update>>().toEqualTypeOf<
      Update.ReturnWithOutMessage<
        HomeModel,
        HomeMessage,
        HomeOutMessage,
        Command.HandlerOf<typeof CreateRoom>
      >
    >()
  })

  it('keeps required and optional context on host-backed Room operations', () => {
    type ExpectedInformJoinedReturn = Update.Return<RoomModel, RoomMessage>
    type ExpectedInformJoined = (
      model: RoomModel,
      joinedCount: number,
      source?: 'Lobby' | 'Game',
    ) => ExpectedInformJoinedReturn
    type InformJoinedReturn = ReturnType<typeof Room.operations.informJoined>
    type IsAny<Value> = 0 extends 1 & Value ? true : false
    type IsUnknown<Value> =
      IsAny<Value> extends true ? false : unknown extends Value ? true : false
    const informedJoined = Room.operations.informJoined(
      RoomModel.make({ roomId: 'room', joinedCount: 0 }),
      2,
      'Game',
    )

    expect(Room.hostHandlers).toEqual([LoadRoom])
    expect(informedJoined.model.joinedCount).toBe(3)
    expectTypeOf<Parameters<typeof Room.update>>().toEqualTypeOf<
      [
        model: RoomModel,
        message: RoomMessage,
        source: 'Reconnect' | 'Route',
        retryCount?: number | undefined,
      ]
    >()
    expectTypeOf<ReturnType<typeof Room.update>>().toEqualTypeOf<
      Update.Return<RoomModel, RoomMessage, Command.HandlerOf<typeof LoadRoom>>
    >()
    expectTypeOf<
      Parameters<typeof Room.operations.informJoined>
    >().toEqualTypeOf<
      [
        model: RoomModel,
        joinedCount: number,
        source?: 'Lobby' | 'Game' | undefined,
      ]
    >()
    expectTypeOf<
      typeof Room.operations.informJoined
    >().toMatchTypeOf<ExpectedInformJoined>()
    expectTypeOf<ExpectedInformJoined>().toMatchTypeOf<
      (
        ...args: Parameters<typeof Room.operations.informJoined>
      ) => ReturnType<typeof Room.operations.informJoined>
    >()
    expectTypeOf<InformJoinedReturn>().toMatchTypeOf<ExpectedInformJoinedReturn>()
    expectTypeOf<ExpectedInformJoinedReturn>().toMatchTypeOf<InformJoinedReturn>()
    expectTypeOf<IsAny<InformJoinedReturn>>().toEqualTypeOf<false>()
    expectTypeOf<IsUnknown<InformJoinedReturn>>().toEqualTypeOf<false>()
  })

  it('retains generic Model and OutMessage payloads with Mount capabilities', () => {
    type ExpectedFinishReturn = Update.ReturnWithOutMessage<
      typeof StringChoice.Model.Type,
      typeof StringChoice.Message.Type,
      typeof StringChoice.OutMessage.Type
    >
    type ExpectedFinish = (
      model: typeof StringChoice.Model.Type,
      value: 'One' | 'Two',
    ) => ExpectedFinishReturn
    type FinishReturn = ReturnType<typeof StringChoice.operations.finish>
    type IsAny<Value> = 0 extends 1 & Value ? true : false
    type IsUnknown<Value> =
      IsAny<Value> extends true ? false : unknown extends Value ? true : false
    const finished = StringChoice.operations.finish(
      StringChoice.Model.make({ value: 'One' }),
      'Two',
    )

    expect(StringChoice.mounts).toEqual([ObserveChoice])
    expect(finished.model.value).toBe('Two')
    expect(finished.outMessage).toEqual({
      _tag: 'SelectedChoice',
      value: 'Two',
    })
    expect(StringChoice.hostHandlers).toEqual([ObserveChoice])
    expectTypeOf<typeof StringChoice.Model.Type>().toEqualTypeOf<
      Readonly<{ value: 'One' | 'Two' }>
    >()
    expectTypeOf<typeof StringChoice.OutMessage.Type>().toEqualTypeOf<
      Readonly<{ _tag: 'SelectedChoice'; value: 'One' | 'Two' }>
    >()
    expectTypeOf<
      Parameters<typeof StringChoice.operations.finish>
    >().toEqualTypeOf<
      [model: typeof StringChoice.Model.Type, value: 'One' | 'Two']
    >()
    expectTypeOf<
      typeof StringChoice.operations.finish
    >().toMatchTypeOf<ExpectedFinish>()
    expectTypeOf<ExpectedFinish>().toMatchTypeOf<
      (
        ...args: Parameters<typeof StringChoice.operations.finish>
      ) => ReturnType<typeof StringChoice.operations.finish>
    >()
    expectTypeOf<FinishReturn>().toMatchTypeOf<ExpectedFinishReturn>()
    expectTypeOf<ExpectedFinishReturn>().toMatchTypeOf<FinishReturn>()
    expectTypeOf<IsAny<FinishReturn>>().toEqualTypeOf<false>()
    expectTypeOf<IsUnknown<FinishReturn>>().toEqualTypeOf<false>()
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
    const FirstNamespace = makeNamespace('AuthoringCollision')
    const SecondNamespace = makeNamespace('AuthoringCollision')
    const first = bindLeaf(makeLeaf(FirstNamespace, Layer.empty), 'first')
    const second = bindLeaf(makeLeaf(SecondNamespace, Layer.empty), 'second')
    const ParentNamespace = makeNamespace('AuthoringCollisionParent')

    const definition = ParentNamespace.makeDefinition({
      Model: LeafParentModel,
      Message: LeafMessage,
    }).makeComposition({
      bindings: [first, second],
    })

    expect(
      definition.bindings.map(childBinding => childBinding.placement),
    ).toEqual(['first', 'second'])
  })

  it('keeps different recipes for one owner isolated by placement', async () => {
    const RepeatedNamespace = makeNamespace('AuthoringRepeated')
    let firstBuilds = 0
    let secondBuilds = 0
    const first = bindLeaf(
      makeLeaf(
        RepeatedNamespace,
        Layer.suspend(() => {
          firstBuilds += 1
          return Layer.empty
        }),
      ),
      'first',
    )
    const second = bindLeaf(
      makeLeaf(
        RepeatedNamespace,
        Layer.suspend(() => {
          secondBuilds += 1
          return Layer.empty
        }),
      ),
      'second',
    )
    const ParentNamespace = makeNamespace('AuthoringRepeatedParent')

    const definition = ParentNamespace.makeDefinition({
      Model: LeafParentModel,
      Message: LeafMessage,
    }).makeComposition({
      bindings: [first, second],
    })
    const prepareParent = () =>
      definition.prepareBlock({
        init: () => ({
          model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
        }),
        update: definition.makeUpdate({
          UpdatedLeaf: model => ({ model }),
        }),
        EffectsLayer: Layer.empty,
      })
    const parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof LeafParentModel,
      typeof prepareParent
    > = Block.assemble(prepareParent)

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer)))

    expect(firstBuilds).toBe(1)
    expect(secondBuilds).toBe(1)
  })

  it('builds one reused block recipe once across placements', async () => {
    const RepeatedNamespace = makeNamespace('AuthoringShared')
    let builds = 0
    const Shared = makeLeaf(
      RepeatedNamespace,
      Layer.suspend(() => {
        builds += 1
        return Layer.empty
      }),
    )
    const first = bindLeaf(Shared, 'first')
    const second = bindLeaf(Shared, 'second')
    const ParentNamespace = makeNamespace('AuthoringSharedParent')

    const definition = ParentNamespace.makeDefinition({
      Model: LeafParentModel,
      Message: LeafMessage,
    }).makeComposition({
      bindings: [first, second],
    })
    const prepareParent = () =>
      definition.prepareBlock({
        init: () => ({
          model: LeafParentModel.make({ leaf: LeafModel.make({ value: '' }) }),
        }),
        update: definition.makeUpdate({
          UpdatedLeaf: model => ({ model }),
        }),
        EffectsLayer: Layer.empty,
      })
    const parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof LeafParentModel,
      typeof prepareParent
    > = Block.assemble(prepareParent)

    // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
    await Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer)))

    expect(builds).toBe(1)
  })

  it('allows named refinements that select the same provider recipe', () => {
    const RefinedNamespace = makeNamespace('AuthoringRefined')
    const EffectsLayer = Layer.suspend(() => Layer.empty)
    const first = bindLeaf(makeLeaf(RefinedNamespace, EffectsLayer), 'first')
    const second = bindLeaf(makeLeaf(RefinedNamespace, EffectsLayer), 'second')
    const ParentNamespace = makeNamespace('AuthoringRefinedParent')

    expect(() =>
      ParentNamespace.makeDefinition({
        Model: LeafParentModel,
        Message: LeafMessage,
      }).makeComposition({
        bindings: [first, second],
      }),
    ).not.toThrow()
  })

  it('credits a bound child Layer in the selected parent graph', () => {
    expect(GraphParent.bindings).toEqual([GraphChildBinding])
    expect(GraphParent.EffectsLayer).not.toBe(Layer.empty)
    expectTypeOf<
      RequirementsOfBlock<typeof GraphParent>
    >().toEqualTypeOf<never>()
  })

  it('keeps policy Command requirements from a bound child named Step', () => {
    expect(PolicyParent.bindings).toEqual([ChoiceWithPolicyCommandBinding])
    expect(PolicyParent.hostHandlers).toEqual([CreateRoom])
  })

  it('scopes a foreign handler explicitly supplied by the host', async () => {
    const Binding = PolicyBindingParent.makeBinding(
      PolicyParentWithHostProvider,
      {
        placement: 'Policy',
        read: (model: PolicyParentModel) => Option.some(model),
        write: (_model, nextModel) => nextModel,
      },
    )
    const composition = PolicyBindingParent.makeComposition({
      bindings: [Binding],
    })
    const foldPolicy = composition.makeUpdate({})
    const model = PolicyParentWithHostProvider.init().model
    const policyUpdate = foldPolicy(model, {
      _tag: 'GotPolicyMessage',
      placement: 'Policy',
      generation: 0,
      message: PolicyParentMessage.ClickedCreateRoom(),
    })

    const messages = await Effect.runPromise(
      Effect.scoped(
        Effect.forEach(policyUpdate.commands ?? [], command =>
          Effect.provide(command.effect, inspectBinding(Binding).EffectsLayer),
        ),
      ),
    )

    expect(messages).toEqual([
      {
        _tag: 'GotPolicyMessage',
        placement: 'Policy',
        generation: 0,
        message: PolicyParentMessage.CompletedCreateRoom({
          roomId: 'provided',
        }),
      },
    ])
  })

  it('retains explicit host provenance through root lowering and recipe selection', async () => {
    const model = PolicyParentWithSelectedHostProvider.init().model
    const lowered = lowerBlock(PolicyParentWithSelectedHostProvider)
    const policyUpdate: Update.Return<
      PolicyParentModel,
      typeof PolicyParentMessage.Type
    > = lowered.update(model, PolicyParentMessage.ClickedCreateRoom())
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
    const Binding = PolicyKeyedParent.makeBinding(
      PolicyParentWithHostProvider,
      {
        placement: 'Policies',
        readAll: (models: ReadonlyArray<PolicyParentModel>) => models,
        key: (): 'only' => 'only',
        keySchema: Schema.Literal('only'),
        read: (item: PolicyParentModel) => item,
        writeAt: (
          _models: ReadonlyArray<PolicyParentModel>,
          _key: 'only',
          nextModel: PolicyParentModel,
        ) => [nextModel],
      },
    )
    const composition = PolicyKeyedParent.makeComposition({
      bindings: [Binding],
    })
    const foldPolicy = composition.makeUpdate({})
    const policyUpdate = foldPolicy([model], {
      _tag: 'GotPoliciesMessage',
      placement: 'Policies',
      generation: 0,
      key: 'only',
      message: PolicyParentMessage.ClickedCreateRoom(),
    })

    const messages = await Effect.runPromise(
      Effect.scoped(
        Effect.forEach(policyUpdate.commands ?? [], command =>
          Effect.provide(command.effect, inspectBinding(Binding).EffectsLayer),
        ),
      ),
    )

    expect(messages).toEqual([
      {
        _tag: 'GotPoliciesMessage',
        placement: 'Policies',
        generation: 0,
        key: 'only',
        message: PolicyParentMessage.CompletedCreateRoom({
          roomId: 'provided',
        }),
      },
    ])
  })

  it('rejects a child handler in its parent local recipe', async () => {
    const prepareParent = () =>
      graphParentComposition.prepareBlock({
        ...graphParentImplementation,
        EffectsLayer: RunChildWork.layer,
      })
    const parent: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof GraphParentModel,
      typeof prepareParent
    > = Block.assemble(prepareParent)

    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(parent.EffectsLayer))),
    ).rejects.toThrow('local EffectsLayer provides the child handler')
  })

  it('rejects a mismatched explicit host provider identity', async () => {
    const OtherRoomNamespace = makeNamespace('AuthoringRoom')
    const OtherLoadRoom = OtherRoomNamespace.makeCommand('LoadRoom', {
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
