import { Context, Effect, Layer, Option, Schema } from 'effect'
import {
  Block,
  Message,
  Route,
  Struct,
  Update,
  defineApplication,
} from 'foldkit'

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
type IsAny<Value> = 0 extends 1 & Value ? true : false
type IsUnknown<Value> =
  IsAny<Value> extends true ? false : unknown extends Value ? true : false
type ExactRequirements<Actual, Expected> =
  IsAny<Actual> extends true
    ? false
    : IsUnknown<Actual> extends true
      ? false
      : [Actual] extends [Expected]
        ? [Expected] extends [Actual]
          ? true
          : false
        : false
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

export class DraftStore extends Context.Service<
  DraftStore,
  Readonly<{ clear: Effect.Effect<void> }>
>()('DeclarationReciprocalDraftStore') {}

export const HomeModel = Schema.Struct({
  username: Schema.String,
  resetCount: Schema.Number,
})
export const HomeMessage = Message.defineMessageUnion({
  SucceededJoinRoom: { roomId: Schema.String, username: Schema.String },
  CompletedClearJoinDraft: {},
})
export const HomeOutMessage = Message.defineMessageUnion({
  JoinedRoom: { roomId: Schema.String, username: Schema.String },
})
const DeclarationReciprocalHome = Block.define('DeclarationReciprocalHome', {
  Model: HomeModel,
  Message: HomeMessage,
  OutMessage: HomeOutMessage,
})
export const ClearJoinDraft = DeclarationReciprocalHome.command(
  'ClearJoinDraft',
  {
    messages: [HomeMessage.CompletedClearJoinDraft],
    handler: function* () {
      const store = yield* DraftStore
      return () =>
        store.clear.pipe(Effect.as(HomeMessage.CompletedClearJoinDraft()))
    },
  },
)
const DeclarationReciprocalHomeComposition =
  DeclarationReciprocalHome.makeComposition()
const resetJoinForm = DeclarationReciprocalHome.step(
  (model, username: string) => ({
    model: Struct.modifyFields(model, {
      username: () => username,
      resetCount: count => count + 1,
    }),
    commands: [ClearJoinDraft()],
  }),
)
const requestJoin = DeclarationReciprocalHome.step(
  (model, roomId: string, username: string) => ({
    model,
    commands: [ClearJoinDraft()],
    outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
  }),
)
export const HomeBlock = DeclarationReciprocalHomeComposition.makeBlock({
  init: DeclarationReciprocalHomeComposition.makeInit(() => ({
    model: HomeModel.make({ username: '', resetCount: 0 }),
  })),
  update: DeclarationReciprocalHomeComposition.makeUpdate((model, message) =>
    HomeMessage.match(message, {
      SucceededJoinRoom: () => ({ model }),
      CompletedClearJoinDraft: () => ({ model }),
    }),
  ),
  expose: { requestJoin, resetJoinForm },
  EffectsLayer: ClearJoinDraft.layer,
})

export const RoomModel = Schema.Struct({
  maybeUsername: Schema.Option(Schema.String),
})
export const RoomContext = Schema.Struct({ roomId: Schema.String })
export const RoomMessage = Message.defineMessageUnion({
  CompletedLeaveRoom: {},
})
export const RoomOutMessage = Message.defineMessageUnion({
  LeftRoom: { roomId: Schema.String },
})
const DeclarationReciprocalRoom = Block.define('DeclarationReciprocalRoom', {
  Model: RoomModel,
  Message: RoomMessage,
  OutMessage: RoomOutMessage,
})
const DeclarationReciprocalRoomComposition =
  DeclarationReciprocalRoom.makeComposition()
const informJoined = DeclarationReciprocalRoom.step(
  (model, username: string, _context: typeof RoomContext.Type) => ({
    model: Struct.modifyFields(model, {
      maybeUsername: () => Option.some(username),
    }),
  }),
)
export const RoomBlock = DeclarationReciprocalRoomComposition.makeBlock({
  init: DeclarationReciprocalRoomComposition.makeInit(
    (maybeUsername: Option.Option<string>) => ({
      model: RoomModel.make({ maybeUsername }),
    }),
  ),
  update: DeclarationReciprocalRoomComposition.makeUpdate(
    (model, message, context: typeof RoomContext.Type) =>
      RoomMessage.match(message, {
        CompletedLeaveRoom: () => ({
          model,
          outMessage: RoomOutMessage.LeftRoom({ roomId: context.roomId }),
        }),
      }),
  ),
  expose: { informJoined },
  EffectsLayer: Layer.empty,
})

export const ApplicationRoute = Route.defineRouteUnion({
  Home: {},
  Room: { roomId: Schema.String },
})
export const RoomInstance = Schema.Struct({
  roomId: Schema.String,
  model: RoomModel,
})
export const ApplicationModel = Schema.Struct({
  home: HomeModel,
  maybeRoomInstance: Schema.Option(RoomInstance),
  route: ApplicationRoute,
})
export const ApplicationMessage = Message.defineMessageUnion({
  GotHomeMessage: { message: HomeBlock.Message },
  GotRoomMessage: { roomId: Schema.String, message: RoomBlock.Message },
})
export const Application = defineApplication({
  Model: ApplicationModel,
  Message: ApplicationMessage,
})

const foldRoomOutMessage = (
  _roomId: string,
  outMessage: typeof RoomOutMessage.Type,
) =>
  RoomOutMessage.match(outMessage, {
    LeftRoom: () =>
      Update.combine([
        Application.step(model => ({
          model: Struct.modifyFields(model, {
            route: () => ApplicationRoute.Home(),
            maybeRoomInstance: () => Option.none(),
          }),
        })),
        HomeBinding.resetJoinForm(''),
      ]),
  })

export const HomeBinding = Application.bindChild(HomeBlock, {
  field: 'home',
  presentWhen: model => model.route._tag === 'Home',
  parentMessage: ApplicationMessage.GotHomeMessage,
  outMessage: {
    fold: HomeOutMessage.match({
      JoinedRoom: ({ roomId, username }) => {
        return Update.combine([
          Application.step(model =>
            RoomBinding.init({
              key: roomId,
              args: [Option.none()],
              toParentModel: room =>
                Struct.modifyFields(model, {
                  maybeRoomInstance: () =>
                    Option.some(RoomInstance.make({ roomId, model: room })),
                }),
            }),
          ),
          RoomBinding.informJoined(roomId, username, { roomId }),
          Application.step(model => ({
            model: Struct.modifyFields(model, {
              route: () => ApplicationRoute.Room({ roomId }),
            }),
          })),
        ])
      },
    }),
  },
})

export const RoomBinding = Application.bindChild(RoomBlock, {
  readAll: model => Option.toArray(model.maybeRoomInstance),
  key: instance => instance.roomId,
  read: instance => instance.model,
  writeAt: (model, roomId, nextRoom) =>
    Struct.modifyFields(model, {
      maybeRoomInstance: Option.map(instance =>
        instance.roomId === roomId
          ? Struct.modifyFields(instance, { model: () => nextRoom })
          : instance,
      ),
    }),
  toParentMessage: (roomId, message) =>
    ApplicationMessage.GotRoomMessage({ roomId, message }),
  fromParentMessage: {
    parentMessage: ApplicationMessage.GotRoomMessage,
    args: (model, { roomId, message }) =>
      model.route._tag === 'Room' && model.route.roomId === roomId
        ? Option.some([roomId, message, { roomId }])
        : Option.none(),
  },
  outMessage: { fold: foldRoomOutMessage },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [HomeBinding, RoomBinding],
})
export const applicationUpdate = ApplicationComposition.makeUpdate()
export const requestJoinStep = HomeBinding.requestJoin('room-1', 'alice')

type HomeReset = ReturnType<typeof HomeBinding.resetJoinForm>
type HomeRequestJoin = ReturnType<typeof HomeBinding.requestJoin>
type HomeFold = ReturnType<typeof HomeBinding.fold>
type RoomInform = ReturnType<typeof RoomBinding.informJoined>
type RoomFold = ReturnType<typeof RoomBinding.fold>
type HomeLayerServicesAreExact = Expect<
  Equal<Layer.Services<typeof HomeBlock.EffectsLayer>, DraftStore>
>
type HomeLayerErrorIsExact = Expect<
  Equal<Layer.Error<typeof HomeBlock.EffectsLayer>, never>
>

type HomeArgumentsAreExact = Expect<
  Equal<Parameters<typeof HomeBinding.resetJoinForm>, [username: string]>
>
type HomeRequestArgumentsAreExact = Expect<
  Equal<
    Parameters<typeof HomeBinding.requestJoin>,
    [roomId: string, username: string]
  >
>
type RoomArgumentsAreExact = Expect<
  Equal<
    Parameters<typeof RoomBinding.informJoined>,
    [key: string, username: string, _context: typeof RoomContext.Type]
  >
>
type RoomInitConfig = Parameters<typeof RoomBinding.init>[0]
type RoomInitKeyIsExact = Expect<Equal<RoomInitConfig['key'], string>>
type RoomInitArgumentsAreExact = Expect<
  Equal<RoomInitConfig['args'], [maybeUsername: Option.Option<string>]>
>
type HomeRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<HomeReset>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.expose.resetJoinForm>
    >
  >
>
type RoomRequirementsAreExact = Expect<
  Equal<Update.RequirementsOf<RoomInform>, never>
>
type RoomFoldRequirementsAreExact = Expect<
  ExactRequirements<
    Update.RequirementsOf<typeof RoomBinding.fold>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.expose.resetJoinForm>
    >
  >
>
type HomeRequestRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<HomeRequestJoin>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.expose.requestJoin>
    >
  >
>
type HomeOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<ReturnType<HomeReset>>, never>
>
type RoomOutMessageIsExact = Expect<
  Equal<ReturnOutMessage<ReturnType<RoomInform>>, never>
>
type RoomFoldOutMessageIsConsumed = Expect<
  Equal<ReturnOutMessage<RoomFold>, never>
>
type HomeRequestOutMessageIsConsumed = Expect<
  Equal<ReturnOutMessage<ReturnType<HomeRequestJoin>>, never>
>
type HomeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<HomeReset>>,
    Block.BindingRequirement<'home', typeof HomeBlock>
  >
>
type RoomRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<RoomInform>>,
    Block.BindingRequirement<'DeclarationReciprocalRoom', typeof RoomBlock>
  >
>
type HomeRequestRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<HomeRequestJoin>>,
    | Block.BindingRequirement<'home', typeof HomeBlock>
    | Block.BindingRequirement<'DeclarationReciprocalRoom', typeof RoomBlock>
  >
>
type HomeFoldRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<HomeFold>,
    Block.BindingRequirement<'home', typeof HomeBlock>
  >
>
type RoomFoldRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<RoomFold>,
    | Block.BindingRequirement<'home', typeof HomeBlock>
    | Block.BindingRequirement<'DeclarationReciprocalRoom', typeof RoomBlock>
  >
>
type ApplicationRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof applicationUpdate>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.expose.resetJoinForm>
    >
  >
>
type ApplicationRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof applicationUpdate>>,
    | Block.BindingRequirement<'home', typeof HomeBlock>
    | Block.BindingRequirement<'DeclarationReciprocalRoom', typeof RoomBlock>
  >
>

export type ReciprocalCoordinationAssertions = [
  HomeLayerServicesAreExact,
  HomeLayerErrorIsExact,
  HomeArgumentsAreExact,
  HomeRequestArgumentsAreExact,
  RoomArgumentsAreExact,
  RoomInitKeyIsExact,
  RoomInitArgumentsAreExact,
  HomeRequirementsAreExact,
  RoomRequirementsAreExact,
  RoomFoldRequirementsAreExact,
  HomeRequestRequirementsAreExact,
  HomeOutMessageIsExact,
  RoomOutMessageIsExact,
  RoomFoldOutMessageIsConsumed,
  HomeRequestOutMessageIsConsumed,
  HomeRegistrationIsExact,
  RoomRegistrationIsExact,
  HomeRequestRegistrationIsExact,
  HomeFoldRegistrationIsExact,
  RoomFoldRegistrationIsExact,
  ApplicationRequirementsAreExact,
  ApplicationRegistrationIsExact,
]

const DirectReciprocalModel = Schema.Struct({
  leftHome: HomeModel,
  rightHome: HomeModel,
})
const DirectReciprocalMessage = Message.defineMessageUnion({
  GotLeftHomeMessage: { message: HomeBlock.Message },
  GotRightHomeMessage: { message: HomeBlock.Message },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares independent Application graphs for direct sibling coordination.
export const DirectReciprocalApplication = defineApplication({
  Model: DirectReciprocalModel,
  Message: DirectReciprocalMessage,
})

export const LeftHomeBinding = DirectReciprocalApplication.bindChild(
  HomeBlock,
  {
    field: 'leftHome',
    parentMessage: DirectReciprocalMessage.GotLeftHomeMessage,
    outMessage: {
      fold: HomeOutMessage.match({
        JoinedRoom: () => RightHomeBinding.resetJoinForm('from-left'),
      }),
    },
  },
)

export const RightHomeBinding = DirectReciprocalApplication.bindChild(
  HomeBlock,
  {
    field: 'rightHome',
    parentMessage: DirectReciprocalMessage.GotRightHomeMessage,
    outMessage: {
      fold: HomeOutMessage.match({
        JoinedRoom: () => LeftHomeBinding.resetJoinForm('from-right'),
      }),
    },
  },
)

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture keeps the direct sibling graph distinct from the keyed sibling graph.
export const DirectReciprocalComposition =
  DirectReciprocalApplication.makeComposition({
    childBindings: [LeftHomeBinding, RightHomeBinding],
  })

type LeftHomeRequest = ReturnType<typeof LeftHomeBinding.requestJoin>
type LeftHomeArgumentsAreExact = Expect<
  Equal<
    Parameters<typeof LeftHomeBinding.requestJoin>,
    [roomId: string, username: string]
  >
>
type LeftHomeRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<LeftHomeRequest>,
    | Block.Scoped<
        'leftHome',
        Update.RequirementsOf<typeof HomeBlock.expose.requestJoin>
      >
    | Block.Scoped<
        'rightHome',
        Update.RequirementsOf<typeof HomeBlock.expose.resetJoinForm>
      >
  >
>
type LeftHomeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<LeftHomeRequest>>,
    | Block.BindingRequirement<'leftHome', typeof HomeBlock>
    | Block.BindingRequirement<'rightHome', typeof HomeBlock>
  >
>

const KeyedHomeEntry = Schema.Struct({
  id: Schema.String,
  home: HomeModel,
})
const KeyedReciprocalModel = Schema.Struct({
  leftHomes: Schema.Array(KeyedHomeEntry),
  rightHomes: Schema.Array(KeyedHomeEntry),
})
const KeyedReciprocalMessage = Message.defineMessageUnion({
  GotLeftHomeMessage: { id: Schema.String, message: HomeBlock.Message },
  GotRightHomeMessage: { id: Schema.String, message: HomeBlock.Message },
})
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares independent Application graphs for keyed sibling coordination.
export const KeyedReciprocalApplication = defineApplication({
  Model: KeyedReciprocalModel,
  Message: KeyedReciprocalMessage,
})

export const LeftKeyedHomeBinding = KeyedReciprocalApplication.bindChild(
  HomeBlock,
  {
    field: 'leftHomes',
    key: 'id',
    childField: 'home',
    toParentMessage: (id, message) =>
      KeyedReciprocalMessage.GotLeftHomeMessage({ id, message }),
    fromParentMessage: false,
    outMessage: { fold: foldLeftKeyedHomeOutMessage },
  },
)

export const RightKeyedHomeBinding = KeyedReciprocalApplication.bindChild(
  HomeBlock,
  {
    field: 'rightHomes',
    key: 'id',
    childField: 'home',
    toParentMessage: (id, message) =>
      KeyedReciprocalMessage.GotRightHomeMessage({ id, message }),
    fromParentMessage: false,
    outMessage: { fold: foldRightKeyedHomeOutMessage },
  },
)

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture keeps the keyed sibling graph distinct from the direct sibling graph.
export const KeyedReciprocalComposition =
  KeyedReciprocalApplication.makeComposition({
    childBindings: [LeftKeyedHomeBinding, RightKeyedHomeBinding],
  })

type LeftKeyedHomeRequest = ReturnType<typeof LeftKeyedHomeBinding.requestJoin>
type LeftKeyedHomeArgumentsAreExact = Expect<
  Equal<
    Parameters<typeof LeftKeyedHomeBinding.requestJoin>,
    [key: string, roomId: string, username: string]
  >
>
type LeftKeyedHomeRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<LeftKeyedHomeRequest>,
    | Block.Scoped<
        'leftHomes',
        Update.RequirementsOf<typeof HomeBlock.expose.requestJoin>
      >
    | Block.Scoped<
        'rightHomes',
        Update.RequirementsOf<typeof HomeBlock.expose.resetJoinForm>
      >
  >
>
type LeftKeyedHomeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<LeftKeyedHomeRequest>>,
    | Block.BindingRequirement<'leftHomes', typeof HomeBlock>
    | Block.BindingRequirement<'rightHomes', typeof HomeBlock>
  >
>

export type AdditionalReciprocalAssertions = [
  LeftHomeArgumentsAreExact,
  LeftHomeRequirementsAreExact,
  LeftHomeRegistrationIsExact,
  LeftKeyedHomeArgumentsAreExact,
  LeftKeyedHomeRequirementsAreExact,
  LeftKeyedHomeRegistrationIsExact,
]

function foldLeftKeyedHomeOutMessage(
  _key: string,
  outMessage: typeof HomeOutMessage.Type,
) {
  return HomeOutMessage.match(outMessage, {
    JoinedRoom: () =>
      RightKeyedHomeBinding.resetJoinForm('right-home', 'from-left'),
  })
}

function foldRightKeyedHomeOutMessage(
  _key: string,
  outMessage: typeof HomeOutMessage.Type,
) {
  return HomeOutMessage.match(outMessage, {
    JoinedRoom: () =>
      LeftKeyedHomeBinding.resetJoinForm('left-home', 'from-right'),
  })
}

export const NestedPolicy = (() => {
  const HomeModel = Schema.Struct({ value: Schema.String })
  const HomeMessage = Message.defineMessageUnion({ CompletedHomeWork: {} })
  const HomeOutMessage = Message.defineMessageUnion({ RequestedRoomWork: {} })
  const Home = Block.define('Home', {
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  })
  const HomeComposition = Home.makeComposition()
  const requestRoomWork = Home.step(model => ({
    model,
    outMessage: HomeOutMessage.RequestedRoomWork(),
  }))
  const HomeBlock = HomeComposition.makeBlock({
    init: HomeComposition.makeInit(() => ({
      model: HomeModel.make({ value: '' }),
    })),
    update: HomeComposition.makeUpdate(model => ({ model })),
    expose: { requestRoomWork },
  })

  const RoomModel = Schema.Struct({ count: Schema.Number })
  const RoomMessage = Message.defineMessageUnion({ CompletedRoomWork: {} })
  const RoomOutMessage = Message.defineMessageUnion({ ChangedRoom: {} })
  const Room = Block.define('Room', {
    Model: RoomModel,
    Message: RoomMessage,
    OutMessage: RoomOutMessage,
  })
  const CompleteRoomWork = Room.command('CompleteRoomWork', {
    messages: [RoomMessage.CompletedRoomWork],
    handler: function* () {
      return () => Effect.succeed(RoomMessage.CompletedRoomWork())
    },
  })
  const RoomComposition = Room.makeComposition()
  const runRoomWork = Room.step(model => ({
    model: RoomModel.make({ count: model.count + 1 }),
    commands: [CompleteRoomWork()],
    outMessage: RoomOutMessage.ChangedRoom(),
  }))
  const RoomBlock = RoomComposition.makeBlock({
    init: RoomComposition.makeInit(() => ({
      model: RoomModel.make({ count: 0 }),
    })),
    update: RoomComposition.makeUpdate(model => ({ model })),
    expose: { runRoomWork },
    EffectsLayer: CompleteRoomWork.layer,
  })

  const ParentModel = Schema.Struct({ home: HomeModel, room: RoomModel })
  const ParentMessage = Message.defineMessageUnion({
    // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
    GotHomeMessage: { message: HomeMessage },
    // eslint-disable-next-line foldkit/got-prefix-requires-block-payload
    GotRoomMessage: { message: RoomMessage },
  })
  const ParentOutMessage = Message.defineMessageUnion({ RoomChanged: {} })
  const Parent = Block.define('Parent', {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })

  const HomeBinding = Parent.bindChild(HomeBlock, {
    field: 'home',
    parentMessage: ParentMessage.GotHomeMessage,
    outMessage: {
      fold: HomeOutMessage.match({
        RequestedRoomWork: () => RoomBinding.runRoomWork(),
      }),
    },
  })
  const RoomBinding = Parent.bindChild(RoomBlock, {
    field: 'room',
    parentMessage: ParentMessage.GotRoomMessage,
    outMessage: {
      fold: RoomOutMessage.match({
        ChangedRoom: () =>
          Parent.step(model => ({
            model,
            outMessage: ParentOutMessage.RoomChanged(),
          })),
      }),
    },
  })

  const ParentComposition = Parent.makeComposition({
    childBindings: [HomeBinding, RoomBinding],
  })

  return {
    Parent,
    ParentComposition,
    ParentModel,
    ParentMessage,
    ParentOutMessage,
    HomeBinding,
    RoomBinding,
  }
})()

type NestedPolicyChannels<Recipe> =
  Recipe extends Update.ResultRecipe<
    infer Model,
    infer Message,
    infer OutMessage,
    infer Requirements,
    infer Evidence
  >
    ? Readonly<{
        model: Model
        message: Message
        outMessage: OutMessage
        requirements: Requirements
        evidence: Evidence
      }>
    : never

type NestedPolicyRecipe = ReturnType<
  ReturnType<typeof NestedPolicy.HomeBinding.requestRoomWork>
>
type NestedPolicyChannelsAreExact = Expect<
  Equal<
    NestedPolicyChannels<NestedPolicyRecipe>,
    Readonly<{
      model: typeof NestedPolicy.ParentModel.Type
      message: typeof NestedPolicy.ParentMessage.Type
      outMessage: typeof NestedPolicy.ParentOutMessage.Type
      requirements: Update.RequirementsOf<
        ReturnType<typeof NestedPolicy.RoomBinding.runRoomWork>
      >
      evidence:
        | Block.RequirementOfBinding<typeof NestedPolicy.HomeBinding>
        | Block.RequirementOfBinding<typeof NestedPolicy.RoomBinding>
    }>
  >
>

export type NestedPolicyAssertions = [NestedPolicyChannelsAreExact]
