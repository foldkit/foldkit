import { Layer, Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Update from 'foldkit/update'

import {
  ApplicationComposition,
  ApplicationDefinition,
  DirectReciprocalApplicationDefinition,
  DirectReciprocalComposition,
  DraftStore,
  HomeBinding,
  HomeBlock,
  HomeOutMessage,
  KeyedReciprocalApplicationDefinition,
  KeyedReciprocalComposition,
  LeftHomeBinding,
  LeftKeyedHomeBinding,
  NestedPolicy,
  RightHomeBinding,
  RightKeyedHomeBinding,
  RoomBinding,
  RoomBlock,
  RoomContext,
  RoomInstance,
  applicationUpdate,
  directReciprocalUpdate,
  keyedReciprocalUpdate,
} from './reciprocal-coordination.accepted.js'

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
type IsNever<Value> = [Value] extends [never] ? true : false
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
type OutgoingMessageOf<BindingValue> =
  BindingValue extends Block.BindingDeliveryEvidence<
    infer OutgoingMessage,
    infer _IncomingMessage,
    infer _GeneratedSchema
  >
    ? OutgoingMessage
    : never

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

export const emittedRequestJoinStep = HomeBinding.requestJoin('room-1', 'alice')

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
type ApplicationDispatchIsExact = Expect<
  Equal<
    typeof ApplicationComposition.Message.Type,
    | Readonly<{
        _tag: 'GotHomeMessage'
        placement: 'home'
        generation: number
        message: typeof HomeBlock.Message.Type
      }>
    | Readonly<{
        _tag: 'GotDeclarationReciprocalRoomMessage'
        placement: 'DeclarationReciprocalRoom'
        generation: number
        key: string
        message: typeof RoomBlock.Message.Type
      }>
  >
>
type DirectDispatchIsExact = Expect<
  Equal<
    typeof DirectReciprocalComposition.Message.Type,
    | Readonly<{
        _tag: 'GotLeftHomeMessage'
        placement: 'leftHome'
        generation: number
        message: typeof HomeBlock.Message.Type
      }>
    | Readonly<{
        _tag: 'GotRightHomeMessage'
        placement: 'rightHome'
        generation: number
        message: typeof HomeBlock.Message.Type
      }>
  >
>
type KeyedDispatchIsExact = Expect<
  Equal<
    typeof KeyedReciprocalComposition.Message.Type,
    | Readonly<{
        _tag: 'GotLeftHomesMessage'
        placement: 'leftHomes'
        generation: number
        key: string
        message: typeof HomeBlock.Message.Type
      }>
    | Readonly<{
        _tag: 'GotRightHomesMessage'
        placement: 'rightHomes'
        generation: number
        key: string
        message: typeof HomeBlock.Message.Type
      }>
  >
>

const roomDelivery = Schema.decodeSync(ApplicationComposition.Message)({
  _tag: 'GotDeclarationReciprocalRoomMessage',
  placement: 'DeclarationReciprocalRoom',
  generation: 0,
  key: 'room-1',
  message: RoomBlock.Message.InformedOfJoin({ username: 'alice' }),
})
void roomDelivery

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

// @ts-expect-error Emitted Room policy retains its Home Binding registration.
const MissingHomeComposition = ApplicationDefinition.makeComposition({
  bindings: [RoomBinding],
})
void MissingHomeComposition

// @ts-expect-error Emitted Home policy retains its Room Binding registration.
const MissingRoomComposition = ApplicationDefinition.makeComposition({
  bindings: [HomeBinding],
})
void MissingRoomComposition

// @ts-expect-error Emitted direct policy retains its sibling registration.
DirectReciprocalApplicationDefinition.makeComposition({
  bindings: [LeftHomeBinding],
})
// @ts-expect-error Emitted direct policy retains its sibling registration.
DirectReciprocalApplicationDefinition.makeComposition({
  bindings: [RightHomeBinding],
})
// @ts-expect-error Emitted keyed policy retains its sibling registration.
KeyedReciprocalApplicationDefinition.makeComposition({
  bindings: [LeftKeyedHomeBinding],
})
// @ts-expect-error Emitted keyed policy retains its sibling registration.
KeyedReciprocalApplicationDefinition.makeComposition({
  bindings: [RightKeyedHomeBinding],
})

// @ts-expect-error Emitted resetJoinForm requires one username.
HomeBinding.resetJoinForm()
// @ts-expect-error Emitted informJoined requires its Room context.
RoomBinding.informJoined('room-1', 'alice')

const PendingHomeBinding = ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
})
// @ts-expect-error Emitted OutMessage children still require a policy before Composition.
ApplicationDefinition.makeComposition({ bindings: [PendingHomeBinding] })

const PendingRoomBinding = ApplicationDefinition.makeBinding(RoomBlock, {
  placement: 'pending-room',
  readAll: (model: typeof ApplicationDefinition.Model.Type) =>
    Option.toArray(model.maybeRoomInstance),
  key: (instance: typeof RoomInstance.Type) => instance.roomId,
  keySchema: Schema.String,
  read: (instance: typeof RoomInstance.Type) => instance.model,
  writeAt: (model: typeof ApplicationDefinition.Model.Type) => model,
  delivery: {
    toUpdateContext: (
      _model: typeof ApplicationDefinition.Model.Type,
      roomId: string,
    ) => [{ roomId }],
  },
})
// @ts-expect-error Emitted keyed OutMessage children still require a policy before Composition.
ApplicationDefinition.makeComposition({ bindings: [PendingRoomBinding] })

ApplicationDefinition.makeBinding(HomeBlock, {
  field: 'home',
}).withOutMessagePolicy({
  // @ts-expect-error Emitted static policies must accept every refined child OutMessage.
  fold: (
    _outMessage: Extract<
      typeof HomeOutMessage.Type,
      Readonly<{ username: 'alice' }>
    >,
  ) => ApplicationDefinition.makeStep(model => ({ model })),
})

export type EmittedReciprocalCoordinationAssertions = [
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
  ApplicationDispatchIsExact,
  DirectDispatchIsExact,
  KeyedDispatchIsExact,
  LeftHomeArgumentsAreExact,
  LeftHomeRequirementsAreExact,
  LeftHomeRegistrationIsExact,
  LeftKeyedHomeArgumentsAreExact,
  LeftKeyedHomeRequirementsAreExact,
  LeftKeyedHomeRegistrationIsExact,
]

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
  ExactRequirements<
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

export type EmittedNestedPolicyAssertions = [
  NestedPolicyDirectChannelsAreExact,
  NestedPolicyRegistrationIsExact,
  NestedPolicyObligationIsRetained,
  NestedPolicyEvidenceIsConcrete,
  NestedPolicyCompletedRequirementsAreExact,
  NestedPolicyCompletedOutMessageIsExact,
  NestedPolicyCompletedRegistrationIsExact,
]

export type EmittedDirectReciprocalRequirements = Expect<
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
export type EmittedDirectReciprocalRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof directReciprocalUpdate>>,
    | Block.RequirementOfBinding<typeof LeftHomeBinding>
    | Block.RequirementOfBinding<typeof RightHomeBinding>
  >
>

export type EmittedKeyedReciprocalRequirements = Expect<
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
export type EmittedKeyedReciprocalRegistration = Expect<
  Equal<
    Update.RegistrationEvidenceOf<ReturnType<typeof keyedReciprocalUpdate>>,
    | Block.RequirementOfBinding<typeof LeftKeyedHomeBinding>
    | Block.RequirementOfBinding<typeof RightKeyedHomeBinding>
  >
>
