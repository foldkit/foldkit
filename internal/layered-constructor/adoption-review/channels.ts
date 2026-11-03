import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import type * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import type * as Update from 'foldkit/update'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  ClickedPlain: {},
  ClickedAnnounce: {},
  ClickedAudit: {},
  CompletedAudit: {},
})
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({ Announced: { value: Schema.Number } })
type OutMessage = typeof OutMessage.Type
export const ChannelReviewKey = Symbol('ChannelReview')
const ChannelReviewDefinition = Block.makeDefinition('ChannelReview', {
  key: ChannelReviewKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
  operations: {
    requestPlain: Message.ClickedPlain,
    requestAnnounce: {
      message: Message.ClickedAnnounce,
      outMessage: OutMessage.Announced,
    },
    requestAudit: Message.ClickedAudit,
  },
})
export const Audit = ChannelReviewDefinition.makeCommand('Audit', {
  messages: [Message.CompletedAudit],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedAudit())
  },
})
const ChannelReviewComposition = ChannelReviewDefinition.makeComposition()
export const update = ChannelReviewComposition.makeUpdate({
  ClickedPlain: ChannelReviewDefinition.makeNoopStep(),
  ClickedAnnounce: model => ({
    model,
    outMessage: OutMessage.Announced({ value: model.count }),
  }),
  ClickedAudit: ChannelReviewDefinition.makeCommandsStep(() => [Audit()]),
  CompletedAudit: ChannelReviewDefinition.makeNoopStep(),
})
const init = ChannelReviewComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const ChannelReviewBlock = ChannelReviewDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, EffectsLayer: Audit.layer }),
)

const NativeChannelReviewDefinition = Block.makeDefinition(
  'NativeChannelReview',
  { Model, Message, OutMessage },
)
const NativeAudit = NativeChannelReviewDefinition.makeCommand('Audit', {
  messages: [Message.CompletedAudit],
})
const NativeChannelReviewComposition =
  NativeChannelReviewDefinition.makeComposition()
export const nativeUpdate = NativeChannelReviewComposition.makeUpdate({
  ClickedPlain: NativeChannelReviewDefinition.makeNoopStep(),
  ClickedAnnounce: model => ({
    model,
    outMessage: OutMessage.Announced({ value: model.count }),
  }),
  ClickedAudit: NativeChannelReviewDefinition.makeCommandsStep(() => [
    NativeAudit(),
  ]),
  CompletedAudit: NativeChannelReviewDefinition.makeNoopStep(),
})

type UpdateOf<PlanValue> =
  PlanValue extends Block.Plan<infer Output, 'Update', infer _Source>
    ? Output
    : never
type AuthoredUpdate = UpdateOf<typeof update>
type TagChannels<UpdateFunction, Tag extends PropertyKey> =
  UpdateFunction extends Block.OperationOutputs<infer Channels>
    ? Extract<Channels, readonly [Tag, unknown, unknown, unknown]>
    : never
type AcquiredUpdate = Block.ExecutableOf<typeof ChannelReviewBlock>['update']
type OutOf<Output> =
  Output extends Readonly<{ outMessage?: infer Out }>
    ? Exclude<Out, undefined>
    : never
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export const selectPlain = (authoredUpdate: AuthoredUpdate, model: Model) =>
  authoredUpdate(model, Message.ClickedPlain())
export const selectAnnounced = (authoredUpdate: AuthoredUpdate, model: Model) =>
  authoredUpdate(model, Message.ClickedAnnounce())
export const selectAudited = (authoredUpdate: AuthoredUpdate, model: Model) =>
  authoredUpdate(model, Message.ClickedAudit())
export const selectPublicPlain = (
  acquiredUpdate: AcquiredUpdate,
  model: Model,
) => acquiredUpdate(model, Message.ClickedPlain())
export const selectPlainOperation = (
  operations: Block.ExecutableOf<typeof ChannelReviewBlock>['operations'],
  model: Model,
) => operations.requestPlain(model)
export const selectAnnounceOperation = (
  operations: Block.ExecutableOf<typeof ChannelReviewBlock>['operations'],
  model: Model,
) => operations.requestAnnounce(model)

export type ExactAuthoringChannels = readonly [
  Expect<Equal<OutOf<ReturnType<typeof selectPlain>>, typeof OutMessage.Type>>,
  Expect<
    Equal<
      Update.RequirementsOf<typeof selectPlain>,
      Command.HandlerOf<typeof Audit>
    >
  >,
  Expect<Equal<TagChannels<AuthoredUpdate, 'ClickedPlain'>[1], never>>,
  Expect<Equal<TagChannels<AuthoredUpdate, 'ClickedPlain'>[2], never>>,
  Expect<
    Equal<
      TagChannels<AuthoredUpdate, 'ClickedAnnounce'>[1],
      typeof OutMessage.Type
    >
  >,
  Expect<Equal<TagChannels<AuthoredUpdate, 'ClickedAnnounce'>[2], never>>,
  Expect<Equal<TagChannels<AuthoredUpdate, 'ClickedAudit'>[1], never>>,
  Expect<
    Equal<
      TagChannels<AuthoredUpdate, 'ClickedAudit'>[2],
      Command.HandlerOf<typeof Audit>
    >
  >,
  Expect<Equal<TagChannels<typeof nativeUpdate, 'ClickedPlain'>[1], never>>,
  Expect<Equal<TagChannels<typeof nativeUpdate, 'ClickedPlain'>[2], never>>,
  Expect<
    Equal<
      TagChannels<typeof nativeUpdate, 'ClickedAudit'>[2],
      Command.HandlerOf<typeof NativeAudit>
    >
  >,
  Expect<
    Equal<OutOf<ReturnType<typeof selectPublicPlain>>, typeof OutMessage.Type>
  >,
  Expect<
    Equal<
      Update.RequirementsOf<typeof selectPublicPlain>,
      | Block.RuntimeCapability<typeof ChannelReviewBlock.owner>
      | Block.InternalExecution<typeof ChannelReviewBlock.owner>
    >
  >,
  Expect<
    Equal<
      Block.FactsOf<typeof ChannelReviewBlock>['updates'],
      Readonly<Record<never, never>>
    >
  >,
  Expect<Equal<OutOf<ReturnType<typeof selectPlainOperation>>, never>>,
  Expect<
    Equal<
      OutOf<ReturnType<typeof selectAnnounceOperation>>,
      typeof OutMessage.Type
    >
  >,
]
export const exactAuthoringChannels: ExactAuthoringChannels = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
]
