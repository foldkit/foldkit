import { Context, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { Block, Message, Route, Struct, Update } from 'foldkit'

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
type IsNever<Value> = [Value] extends [never] ? true : false
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
type OutgoingMessageOf<BindingValue> =
  BindingValue extends Block.BindingDeliveryEvidence<
    infer OutgoingMessage,
    infer _IncomingMessage,
    infer _GeneratedSchema
  >
    ? OutgoingMessage
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
  RequestedJoin: { roomId: Schema.String, username: Schema.String },
  RequestedResetJoinForm: { username: Schema.String },
  CompletedClearJoinDraft: {},
})
export const HomeOutMessage = Message.defineMessageUnion({
  JoinedRoom: { roomId: Schema.String, username: Schema.String },
})
const DeclarationReciprocalHomeDefinition = Block.makeDefinition(
  'DeclarationReciprocalHome',
  {
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  },
)
export const ClearJoinDraft = DeclarationReciprocalHomeDefinition.makeCommand(
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
  DeclarationReciprocalHomeDefinition.makeComposition()
const resetJoinFormStep = DeclarationReciprocalHomeDefinition.makeStep(
  (model, username: string) => ({
    model: Struct.modifyFields(model, {
      username: () => username,
      resetCount: count => count + 1,
    }),
    commands: [ClearJoinDraft()],
  }),
)
const requestJoinHomeStep = DeclarationReciprocalHomeDefinition.makeStep(
  (model, roomId: string, username: string) => ({
    model,
    commands: [ClearJoinDraft()],
    outMessage: HomeOutMessage.JoinedRoom({ roomId, username }),
  }),
)
const prepareHomeBlock = () =>
  DeclarationReciprocalHomeComposition.prepareBlock({
    init: DeclarationReciprocalHomeComposition.makeInit(() => ({
      model: HomeModel.make({ username: '', resetCount: 0 }),
    })),
    update: DeclarationReciprocalHomeComposition.makeUpdate({
      SucceededJoinRoom: model => ({ model }),
      RequestedJoin: (model, { roomId, username }) =>
        requestJoinHomeStep(model, roomId, username),
      RequestedResetJoinForm: (model, { username }) =>
        resetJoinFormStep(model, username),
      CompletedClearJoinDraft: model => ({ model }),
    }),
    operations: {
      requestJoin: (roomId: string, username: string) =>
        Tuple.make(HomeMessage.RequestedJoin({ roomId, username })),
      resetJoinForm: (username: string) =>
        Tuple.make(HomeMessage.RequestedResetJoinForm({ username })),
    },
    EffectsLayer: ClearJoinDraft.layer,
  })
export const HomeBlock: Block.FromAssemblyWithOutMessage<
  typeof HomeModel,
  typeof prepareHomeBlock
> = Block.assemble(prepareHomeBlock)

export const RoomModel = Schema.Struct({
  maybeUsername: Schema.Option(Schema.String),
})
export const RoomContext = Schema.Struct({ roomId: Schema.String })
export const RoomMessage = Message.defineMessageUnion({
  InformedOfJoin: { username: Schema.String },
  CompletedLeaveRoom: {},
})
export const RoomOutMessage = Message.defineMessageUnion({
  LeftRoom: { roomId: Schema.String },
})
const DeclarationReciprocalRoomDefinition = Block.makeDefinition(
  'DeclarationReciprocalRoom',
  {
    Model: RoomModel,
    Message: RoomMessage,
    OutMessage: RoomOutMessage,
  },
)
const DeclarationReciprocalRoomComposition =
  DeclarationReciprocalRoomDefinition.makeComposition()
const informJoinedStep = DeclarationReciprocalRoomDefinition.makeStep(
  (model, username: string, _context: typeof RoomContext.Type) => ({
    model: Struct.modifyFields(model, {
      maybeUsername: () => Option.some(username),
    }),
  }),
)
const prepareRoomBlock = () =>
  DeclarationReciprocalRoomComposition.prepareBlock({
    init: DeclarationReciprocalRoomComposition.makeInit(
      (maybeUsername: Option.Option<string>) => ({
        model: RoomModel.make({ maybeUsername }),
      }),
    ),
    update: DeclarationReciprocalRoomComposition.makeUpdate.withContext(
      (context: typeof RoomContext.Type) => ({
        InformedOfJoin: (model, { username }) =>
          informJoinedStep(model, username, context),
        CompletedLeaveRoom: model => ({
          model,
          outMessage: RoomOutMessage.LeftRoom({ roomId: context.roomId }),
        }),
      }),
    ),
    operations: {
      informJoined: (username: string, context: typeof RoomContext.Type) =>
        Tuple.make(RoomMessage.InformedOfJoin({ username }), context),
    },
    EffectsLayer: Layer.empty,
  })
export const RoomBlock: Block.FromAssemblyWithOutMessage<
  typeof RoomModel,
  typeof prepareRoomBlock
> = Block.assemble(prepareRoomBlock)

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
export const ApplicationMessage = Schema.Never
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ApplicationModel,
  Message: ApplicationMessage,
})

const foldRoomOutMessage = ApplicationDefinition.makeOutMessageFold(RoomBlock, {
  LeftRoom: () =>
    Update.combineSteps([
      ApplicationDefinition.makeStep(model => ({
        model: Struct.modifyFields(model, {
          route: () => ApplicationRoute.Home(),
          maybeRoomInstance: () => Option.none(),
        }),
      })),
      HomeBinding.resetJoinForm(''),
    ]),
})

export const HomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
  presentWhen: model => model.route._tag === 'Home',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(HomeBlock, {
    JoinedRoom: ({ roomId, username }) => {
      return Update.combineSteps([
        ApplicationDefinition.makeStep(model =>
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
        ApplicationDefinition.makeStep(model => ({
          model: Struct.modifyFields(model, {
            route: () => ApplicationRoute.Room({ roomId }),
          }),
        })),
      ])
    },
  }),
})

export const RoomBinding = ApplicationDefinition.makeBinding(RoomBlock, {
  readAll: model => Option.toArray(model.maybeRoomInstance),
  key: instance => instance.roomId,
  keySchema: RoomInstance.fields.roomId,
  read: instance => instance.model,
  writeAt: (model, roomId, nextRoom) =>
    Struct.modifyFields(model, {
      maybeRoomInstance: Option.map(instance =>
        instance.roomId === roomId
          ? Struct.modifyFields(instance, { model: () => nextRoom })
          : instance,
      ),
    }),
  delivery: {
    when: (model, roomId) =>
      model.route._tag === 'Room' && model.route.roomId === roomId,
    toUpdateContext: (_model, roomId) => [{ roomId }],
  },
}).withOutMessagePolicy({
  fold: (_roomId, outMessage) => foldRoomOutMessage(outMessage),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding, RoomBinding],
})
export const applicationUpdate = ApplicationComposition.makeUpdate({})
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
      Update.RequirementsOf<typeof HomeBlock.operations.resetJoinForm>
    >
  >
>
type RoomRequirementsAreExact = Expect<
  Equal<Update.RequirementsOf<RoomInform>, never>
>
type RoomFoldRequirementsAreExact = Expect<
  Equal<Update.RequirementsOf<typeof RoomBinding.fold>, never>
>
type HomeRequestRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<HomeRequestJoin>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.operations.requestJoin>
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
    Block.RequirementOfBinding<typeof HomeBinding>
  >
>
type RoomRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<RoomInform>>,
    Block.RequirementOfBinding<typeof RoomBinding>
  >
>
type HomeRequestRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<HomeRequestJoin>>,
    Block.RequirementOfBinding<typeof HomeBinding>
  >
>
type HomeFoldRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<HomeFold>,
    Block.RequirementOfBinding<typeof HomeBinding>
  >
>
type RoomFoldRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<RoomFold>,
    Block.RequirementOfBinding<typeof RoomBinding>
  >
>
type ApplicationRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof applicationUpdate>,
    Block.Scoped<
      'home',
      Update.RequirementsOf<typeof HomeBlock.operations.resetJoinForm>
    >
  >
>
type ApplicationRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof applicationUpdate>>,
    | Block.RequirementOfBinding<typeof HomeBinding>
    | Block.RequirementOfBinding<typeof RoomBinding>
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
const DirectReciprocalMessage = Schema.Never
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares independent Application graphs for direct sibling coordination.
export const DirectReciprocalApplicationDefinition = Block.makeDefinition(
  'Application',
  {
    Model: DirectReciprocalModel,
    Message: DirectReciprocalMessage,
  },
)

export const LeftHomeBinding =
  DirectReciprocalApplicationDefinition.makeBinding(HomeBlock, {
    field: 'leftHome',
  }).withOutMessagePolicy({
    fold: HomeOutMessage.match({
      JoinedRoom: () => RightHomeBinding.resetJoinForm('from-left'),
    }),
  })

export const RightHomeBinding =
  DirectReciprocalApplicationDefinition.makeBinding(HomeBlock, {
    field: 'rightHome',
  }).withOutMessagePolicy({
    fold: HomeOutMessage.match({
      JoinedRoom: () => LeftHomeBinding.resetJoinForm('from-right'),
    }),
  })

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture keeps the direct sibling graph distinct from the keyed sibling graph.
export const DirectReciprocalComposition =
  DirectReciprocalApplicationDefinition.makeComposition({
    bindings: [LeftHomeBinding, RightHomeBinding],
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
    Block.Scoped<
      'leftHome',
      Update.RequirementsOf<typeof HomeBlock.operations.requestJoin>
    >
  >
>
type LeftHomeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<LeftHomeRequest>>,
    Block.RequirementOfBinding<typeof LeftHomeBinding>
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
const KeyedReciprocalMessage = Schema.Never
// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture compares independent Application graphs for keyed sibling coordination.
export const KeyedReciprocalApplicationDefinition = Block.makeDefinition(
  'Application',
  {
    Model: KeyedReciprocalModel,
    Message: KeyedReciprocalMessage,
  },
)

export const LeftKeyedHomeBinding =
  KeyedReciprocalApplicationDefinition.makeBinding(HomeBlock, {
    field: 'leftHomes',
    placement: 'leftHomes',
    key: 'id',
    childField: 'home',
  }).withOutMessagePolicy({ fold: foldLeftKeyedHomeOutMessage })

export const RightKeyedHomeBinding =
  KeyedReciprocalApplicationDefinition.makeBinding(HomeBlock, {
    field: 'rightHomes',
    placement: 'rightHomes',
    key: 'id',
    childField: 'home',
  }).withOutMessagePolicy({ fold: foldRightKeyedHomeOutMessage })

// oxlint-disable-next-line foldkit/block-name-matches-variable -- This fixture keeps the keyed sibling graph distinct from the direct sibling graph.
export const KeyedReciprocalComposition =
  KeyedReciprocalApplicationDefinition.makeComposition({
    bindings: [LeftKeyedHomeBinding, RightKeyedHomeBinding],
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
    Block.Scoped<
      'leftHomes',
      Update.RequirementsOf<typeof HomeBlock.operations.requestJoin>
    >
  >
>
type LeftKeyedHomeRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<LeftKeyedHomeRequest>>,
    Block.RequirementOfBinding<typeof LeftKeyedHomeBinding>
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
  const HomeMessage = Message.defineMessageUnion({
    CompletedHomeWork: {},
    RequestedRoomWork: {},
  })
  const HomeOutMessage = Message.defineMessageUnion({ RequestedRoomWork: {} })
  const HomeDefinition = Block.makeDefinition('Home', {
    Model: HomeModel,
    Message: HomeMessage,
    OutMessage: HomeOutMessage,
  })
  const HomeComposition = HomeDefinition.makeComposition()
  const requestRoomWorkStep = HomeDefinition.makeStep(model => ({
    model,
    outMessage: HomeOutMessage.RequestedRoomWork(),
  }))
  const prepareHomeBlock = () =>
    HomeComposition.prepareBlock({
      init: HomeComposition.makeInit(() => ({
        model: HomeModel.make({ value: '' }),
      })),
      update: HomeComposition.makeUpdate({
        CompletedHomeWork: model => ({ model }),
        RequestedRoomWork: model => requestRoomWorkStep(model),
      }),
      operations: {
        requestRoomWork: () => Tuple.make(HomeMessage.RequestedRoomWork()),
      },
    })
  const HomeBlock: Block.FromAssemblyWithOutMessage<
    typeof HomeModel,
    typeof prepareHomeBlock
  > = Block.assemble(prepareHomeBlock)

  const RoomModel = Schema.Struct({ count: Schema.Number })
  const RoomMessage = Message.defineMessageUnion({
    CompletedRoomWork: {},
    RequestedRoomWork: {},
  })
  const RoomOutMessage = Message.defineMessageUnion({ ChangedRoom: {} })
  const RoomDefinition = Block.makeDefinition('Room', {
    Model: RoomModel,
    Message: RoomMessage,
    OutMessage: RoomOutMessage,
  })
  const CompleteRoomWork = RoomDefinition.makeCommand('CompleteRoomWork', {
    messages: [RoomMessage.CompletedRoomWork],
    handler: function* () {
      return () => Effect.succeed(RoomMessage.CompletedRoomWork())
    },
  })
  const RoomComposition = RoomDefinition.makeComposition()
  const runRoomWorkStep = RoomDefinition.makeStep(model => ({
    model: RoomModel.make({ count: model.count + 1 }),
    commands: [CompleteRoomWork()],
    outMessage: RoomOutMessage.ChangedRoom(),
  }))
  const prepareRoomBlock = () =>
    RoomComposition.prepareBlock({
      init: RoomComposition.makeInit(() => ({
        model: RoomModel.make({ count: 0 }),
      })),
      update: RoomComposition.makeUpdate({
        CompletedRoomWork: model => ({ model }),
        RequestedRoomWork: model => runRoomWorkStep(model),
      }),
      operations: {
        runRoomWork: () => Tuple.make(RoomMessage.RequestedRoomWork()),
      },
      EffectsLayer: CompleteRoomWork.layer,
    })
  const RoomBlock: Block.FromAssemblyWithOutMessage<
    typeof RoomModel,
    typeof prepareRoomBlock
  > = Block.assemble(prepareRoomBlock)

  const ParentModel = Schema.Struct({ home: HomeModel, room: RoomModel })
  const ParentMessage = Schema.Never
  const ParentOutMessage = Message.defineMessageUnion({ RoomChanged: {} })
  const ParentDefinition = Block.makeDefinition('Parent', {
    Model: ParentModel,
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })

  const HomeBinding = ParentDefinition.makeBinding(HomeBlock, {
    field: 'home',
  }).withOutMessagePolicy({
    fold: HomeOutMessage.match({
      RequestedRoomWork: () => RoomBinding.runRoomWork(),
    }),
  })
  const RoomBinding = ParentDefinition.makeBinding(RoomBlock, {
    field: 'room',
  }).withOutMessagePolicy({
    fold: RoomOutMessage.match({
      ChangedRoom: () =>
        ParentDefinition.makeStep(model => ({
          model,
          outMessage: ParentOutMessage.RoomChanged(),
        })),
    }),
  })

  const ParentComposition = ParentDefinition.makeComposition({
    bindings: [HomeBinding, RoomBinding],
  })

  return {
    Parent: ParentDefinition,
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
const nestedPolicyUpdate = NestedPolicy.ParentComposition.makeUpdate({})
type NestedPolicyDirectChannelsAreExact = Expect<
  Equal<
    Omit<NestedPolicyChannels<NestedPolicyRecipe>, 'evidence'>,
    Readonly<{
      model: typeof NestedPolicy.ParentModel.Type
      message: OutgoingMessageOf<typeof NestedPolicy.HomeBinding>
      outMessage: never
      requirements: never
    }>
  >
>

type NestedPolicyEvidence = NestedPolicyChannels<NestedPolicyRecipe>['evidence']
type NestedPolicyRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<NestedPolicyRecipe>,
    Block.RequirementOfBinding<typeof NestedPolicy.HomeBinding>
  >
>
type NestedPolicyObligationIsRetained = Expect<
  Equal<
    IsNever<
      Exclude<
        NestedPolicyEvidence,
        Block.RequirementOfBinding<typeof NestedPolicy.HomeBinding>
      >
    >,
    false
  >
>
type NestedPolicyEvidenceIsConcrete = Expect<
  Equal<IsAny<NestedPolicyEvidence> | IsUnknown<NestedPolicyEvidence>, false>
>
type NestedPolicyCompletedRequirementsAreExact = Expect<
  Equal<
    Update.RequirementsOf<typeof nestedPolicyUpdate>,
    Update.RequirementsOf<
      ReturnType<typeof NestedPolicy.RoomBinding.runRoomWork>
    >
  >
>
type NestedPolicyCompletedOutMessageIsExact = Expect<
  Equal<
    ReturnOutMessage<ReturnType<typeof nestedPolicyUpdate>>,
    typeof NestedPolicy.ParentOutMessage.Type
  >
>
type NestedPolicyCompletedRegistrationIsExact = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof nestedPolicyUpdate>>,
    | Block.RequirementOfBinding<typeof NestedPolicy.HomeBinding>
    | Block.RequirementOfBinding<typeof NestedPolicy.RoomBinding>
  >
>

export type NestedPolicyAssertions = [
  NestedPolicyDirectChannelsAreExact,
  NestedPolicyRegistrationIsExact,
  NestedPolicyObligationIsRetained,
  NestedPolicyEvidenceIsConcrete,
  NestedPolicyCompletedRequirementsAreExact,
  NestedPolicyCompletedOutMessageIsExact,
  NestedPolicyCompletedRegistrationIsExact,
]

export const directReciprocalUpdate = DirectReciprocalComposition.makeUpdate({})
export type DirectReciprocalResolvedRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<typeof directReciprocalUpdate>,
    | Block.Scoped<
        'leftHome',
        Update.RequirementsOf<typeof HomeBlock.operations.requestJoin>
      >
    | Block.Scoped<
        'rightHome',
        Update.RequirementsOf<typeof HomeBlock.operations.resetJoinForm>
      >
  >
>
export type DirectReciprocalResolvedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof directReciprocalUpdate>>,
    | Block.RequirementOfBinding<typeof LeftHomeBinding>
    | Block.RequirementOfBinding<typeof RightHomeBinding>
  >
>

export const keyedReciprocalUpdate = KeyedReciprocalComposition.makeUpdate({})
export type KeyedReciprocalResolvedRequirements = Expect<
  ExactRequirements<
    Update.RequirementsOf<typeof keyedReciprocalUpdate>,
    | Block.Scoped<
        'leftHomes',
        Update.RequirementsOf<typeof HomeBlock.operations.requestJoin>
      >
    | Block.Scoped<
        'rightHomes',
        Update.RequirementsOf<typeof HomeBlock.operations.resetJoinForm>
      >
  >
>
export type KeyedReciprocalResolvedRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof keyedReciprocalUpdate>>,
    | Block.RequirementOfBinding<typeof LeftKeyedHomeBinding>
    | Block.RequirementOfBinding<typeof RightKeyedHomeBinding>
  >
>
