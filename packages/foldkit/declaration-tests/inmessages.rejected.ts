import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'

import {
  CounterComposition,
  CounterContract,
  CounterDefinition,
  InMessage,
  Message,
  Model,
  OutMessage,
  ParentComposition,
  ParentContract,
  ParentDefinition,
  ParentOutMessage,
  Save,
  StringInputFamily,
  StringInputFamilyComposition,
  init,
  update,
} from './inmessages.accepted.js'

const FamilyOverlapKey = Symbol('InMessagesFamilyOverlap')
const familyOverlap = Object.freeze({
  key: FamilyOverlapKey,
  Model,
  Message: InMessage,
  InMessage,
  InitArgs: Schema.Tuple([]),
})
// @ts-expect-error Family input and local Message tags must be distinct.
Block.makeFamilyDefinition('InMessagesFamilyOverlap', familyOverlap)

const FamilyUntaggedKey = Symbol('InMessagesFamilyUntagged')
const familyUntagged = Object.freeze({
  key: FamilyUntaggedKey,
  Model,
  Message,
  InMessage: Schema.Struct({ value: Schema.Number }),
  InitArgs: Schema.Tuple([]),
})
// @ts-expect-error Families require a finite union-owned InMessage Schema.
Block.makeFamilyDefinition('InMessagesFamilyUntagged', familyUntagged)

const FamilyOutputKey = Symbol('InMessagesFamilyUnknownOutput')
const familyUnknownOutput = Object.freeze({
  key: FamilyOutputKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: { RequestedUnknown: {} },
})
// @ts-expect-error Family output metadata can only name declared input variants.
Block.makeFamilyDefinition('InMessagesFamilyUnknownOutput', familyUnknownOutput)

const FamilyPrefixKey = Symbol('InMessagesFamilyPrefix')
const familyPrefix = Object.freeze({
  key: FamilyPrefixKey,
  Model,
  Message,
  InMessage: defineMessageUnion({ ClickedSet: {} }),
  InitArgs: Schema.Tuple([]),
})
// @ts-expect-error Family inputs must produce request or inform operation names.
Block.makeFamilyDefinition('InMessagesFamilyPrefix', familyPrefix)

StringInputFamilyComposition.makeInMessageUpdate({
  RequestedSet: (_model, input) => {
    // @ts-expect-error Generic family specialization preserves its string input.
    const value: number = input.value

    return { model: { value: globalThis.String(value) } }
  },
  RequestedClear: StringInputFamily.makeNoopStep(),
})

const ExtraMetadataKey = Symbol('ExtraInputMetadata')
const extraMetadata = Object.freeze({
  key: ExtraMetadataKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: {
    RequestedReport: {
      outMessage: OutMessage.Reported,
      message: Message.UpdatedLabel,
    },
  },
})
// @ts-expect-error Input result metadata cannot smuggle a local Message adapter.
Block.makeDefinition('ExtraInputMetadata', extraMetadata)

// @ts-expect-error Every declared input requires an input update case.
CounterComposition.makeInMessageUpdate({
  RequestedSetCount: CounterDefinition.makeNoopStep(),
  RequestedSave: CounterDefinition.makeNoopStep(),
  RequestedReport: CounterDefinition.makeNoopStep(),
})

const extraCase = {
  RequestedClear: CounterDefinition.makeNoopStep(),
  RequestedSetCount: CounterDefinition.makeNoopStep(),
  RequestedSave: CounterDefinition.makeNoopStep(),
  RequestedReport: CounterDefinition.makeNoopStep(),
  RequestedUnknown: CounterDefinition.makeNoopStep(),
}

// @ts-expect-error An input update record cannot declare undeclared inputs.
CounterComposition.makeInMessageUpdate(extraCase)

CounterComposition.makeInMessageUpdate({
  RequestedClear: CounterDefinition.makeNoopStep(),
  RequestedSetCount: CounterDefinition.makeFieldsStep.fromMessage(input => {
    // @ts-expect-error This input contains count rather than label.
    input.label

    return { count: () => input.count }
  }),
  RequestedSave: CounterDefinition.makeNoopStep(),
  RequestedReport: CounterDefinition.makeNoopStep(),
})

declare const inputCommand: Command.Command<
  typeof InMessage.RequestedClear.Type
>

CounterComposition.makeInMessageUpdate({
  RequestedClear: CounterDefinition.makeNoopStep(),
  RequestedSetCount: CounterDefinition.makeNoopStep(),
  // @ts-expect-error Input Messages cannot become local Command results.
  RequestedSave: CounterDefinition.makeCommandsStep(() => [inputCommand]),
  RequestedReport: CounterDefinition.makeNoopStep(),
})

declare const counter: Block.ExecutableOf<typeof CounterContract>
declare const parent: Block.ExecutableOf<typeof ParentContract>

counter.inMessageUpdate(
  Model.make({ count: 0, label: '' }),
  // @ts-expect-error A local fact is not an InMessage.
  Message.CompletedSave({ count: 0 }),
)
// @ts-expect-error An InMessage is not a local dispatch Message.
counter.update(Model.make({ count: 0, label: '' }), InMessage.RequestedClear())
counter.inMessageUpdate(
  // @ts-expect-error An input update preserves the Model's actual field types.
  { count: 'wrong', label: '' },
  InMessage.RequestedClear(),
)
// @ts-expect-error A generated method retains its input payload.
counter.operations.requestSetCount({ count: 0, label: '' }, { count: 'wrong' })
// @ts-expect-error An empty input variant needs no placeholder object.
counter.operations.requestClear({ count: 0, label: '' }, {})
// @ts-expect-error The public generated name omits the past-tense suffix.
counter.operations.requestedClear
parent.inMessageUpdate(
  { counter: { count: 0, label: '' } },
  // @ts-expect-error A parent input update cannot accept a child's input union directly.
  InMessage.RequestedClear(),
)

const missingReceive = Effect.succeed({
  children: [],
  init,
  update,
  EffectsLayer: Save.layer,
})

// @ts-expect-error A Definition with InMessage requires its input update plan at completion.
CounterDefinition.makeBlock(missingReceive)

const OtherKey = Symbol('InMessagesOtherGraph')
const OtherDefinition = Block.makeDefinition('InMessagesOtherGraph', {
  key: OtherKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  inMessageOutputs: { RequestedReport: { outMessage: OutMessage.Reported } },
})
const OtherComposition = OtherDefinition.makeComposition()
const foreignInMessageUpdate = OtherComposition.makeInMessageUpdate({
  RequestedClear: OtherDefinition.makeNoopStep(),
  RequestedSetCount: OtherDefinition.makeNoopStep(),
  RequestedSave: OtherDefinition.makeNoopStep(),
  RequestedReport: OtherDefinition.makeNoopStep(),
})

// @ts-expect-error An input update plan retains its original Definition and graph.
CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    inMessageUpdate: foreignInMessageUpdate,
    EffectsLayer: Save.layer,
  }),
)

const SilentKey = Symbol('InMessagesSilentBound')
const SilentDefinition = Block.makeDefinition('InMessagesSilentBound', {
  key: SilentKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
})
const SilentComposition = SilentDefinition.makeComposition()
const undeclaredEmission = SilentComposition.makeInMessageUpdate({
  RequestedClear: SilentDefinition.makeNoopStep(),
  RequestedSetCount: SilentDefinition.makeNoopStep(),
  RequestedSave: SilentDefinition.makeNoopStep(),
  RequestedReport: SilentDefinition.makeOutMessageStep.fromMessage(
    ({ label }) => OutMessage.Reported({ label }),
  ),
})

// @ts-expect-error A missing sparse output entry promises silence for that input.
SilentDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: SilentComposition.makeInit(() => ({
      model: Model.make({ count: 0, label: '' }),
    })),
    update: SilentComposition.makeUpdate({
      UpdatedLabel: SilentDefinition.makeNoopStep(),
      CompletedSave: SilentDefinition.makeNoopStep(),
    }),
    inMessageUpdate: undeclaredEmission,
  }),
)

const UnregisteredBinding = ParentDefinition.makeRequiredFieldBinding(
  CounterContract,
  {
    field: 'counter',
    placement: 'unregistered-counter',
  },
).withOutMessagePolicy({
  forward: ParentDefinition.makeOutMessageForward(CounterContract, {
    Reported: ({ label }) => ParentOutMessage.ChildReported({ label }),
  }),
})

ParentComposition.makeInMessageUpdate({
  RequestedClearChild: ParentDefinition.makeNoopStep(),
  // @ts-expect-error An input update handler cannot use an unregistered connected child graph.
  RequestedReportChild: ParentDefinition.makeStep.fromMessage(({ label }) =>
    UnregisteredBinding.requestReport({ label }),
  ),
})
