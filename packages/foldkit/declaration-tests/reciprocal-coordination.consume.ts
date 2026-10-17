import { Layer, Option } from 'effect'
import * as Block from 'foldkit/block'
import * as Update from 'foldkit/update'

import {
  Application,
  ApplicationMessage,
  DirectReciprocalApplication,
  DraftStore,
  HomeBinding,
  HomeBlock,
  HomeOutMessage,
  KeyedReciprocalApplication,
  LeftHomeBinding,
  LeftKeyedHomeBinding,
  NestedPolicy,
  RightHomeBinding,
  RightKeyedHomeBinding,
  RoomBinding,
  RoomBlock,
  RoomContext,
  applicationUpdate,
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

// @ts-expect-error Emitted Room policy retains its Home Binding registration.
const MissingHomeComposition = Application.makeComposition({
  childBindings: [RoomBinding],
})
// @ts-expect-error Emitted Room policy retains its Home Binding registration.
MissingHomeComposition.makeUpdate()

// @ts-expect-error Emitted Home policy retains its Room Binding registration.
const MissingRoomComposition = Application.makeComposition({
  childBindings: [HomeBinding],
})
// @ts-expect-error Emitted Home policy retains its Room Binding registration.
MissingRoomComposition.makeUpdate()

// @ts-expect-error Emitted direct policy retains its sibling registration.
DirectReciprocalApplication.makeComposition({
  childBindings: [LeftHomeBinding],
})
// @ts-expect-error Emitted direct policy retains its sibling registration.
DirectReciprocalApplication.makeComposition({
  childBindings: [RightHomeBinding],
})
// @ts-expect-error Emitted keyed policy retains its sibling registration.
KeyedReciprocalApplication.makeComposition({
  childBindings: [LeftKeyedHomeBinding],
})
// @ts-expect-error Emitted keyed policy retains its sibling registration.
KeyedReciprocalApplication.makeComposition({
  childBindings: [RightKeyedHomeBinding],
})

// @ts-expect-error Emitted resetJoinForm requires one username.
HomeBinding.resetJoinForm()
// @ts-expect-error Emitted informJoined requires its Room context.
RoomBinding.informJoined('room-1', 'alice')

// @ts-expect-error Emitted OutMessage children still require a policy.
// oxfmt-ignore
Application.bindChild(HomeBlock, { field: 'home', parentMessage: ApplicationMessage.GotHomeMessage })

// @ts-expect-error Emitted keyed OutMessage children still require a policy.
// oxfmt-ignore
Application.bindChild(RoomBlock, { readAll: model => Option.toArray(model.maybeRoomInstance), key: instance => instance.roomId, read: instance => instance.model, writeAt: model => model, toParentMessage: (roomId, message) => ApplicationMessage.GotRoomMessage({ roomId, message }), fromParentMessage: false })

// @ts-expect-error Emitted static policies must accept every refined child OutMessage.
// oxfmt-ignore
Application.bindChild(HomeBlock, { field: 'home', parentMessage: ApplicationMessage.GotHomeMessage, outMessage: { fold: (_outMessage: Extract<typeof HomeOutMessage.Type, Readonly<{ username: 'alice' }>>) => Application.step(model => ({ model })) } })

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

export type EmittedNestedPolicyAssertions = [NestedPolicyChannelsAreExact]

// @ts-expect-error A policy-returned sibling recipe retains its required Binding.
NestedPolicy.Parent.makeComposition({
  childBindings: [NestedPolicy.HomeBinding],
})
