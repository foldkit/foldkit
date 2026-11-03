import { Effect, type Layer } from 'effect'
import type * as Block from 'foldkit/block'

import {
  ConstructionInput,
  ConstructionUnavailable,
  CounterBinding,
  CounterBlock,
  CounterContract,
  CounterDefinition,
  FallibleCounterBlock,
  HandlerUnavailable,
  InMessage,
  InputOnlyContract,
  InputOnlyInMessage,
  OutMessage,
  ParentBlock,
  ParentContract,
  ParentOutMessage,
  Save,
  Storage,
  StringInputFamily,
  init,
  makeCommandsStep,
  makeFieldsStep,
  makeInMessageUpdate,
  makeOutMessageStep,
  makeStep,
  parentReceiveResults,
  receiveResults,
  update,
} from './inmessages.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
type Results = Effect.Success<typeof receiveResults>
type ParentResults = Effect.Success<typeof parentReceiveResults>

export type ExactFamilyInput = Assert<
  Equal<
    typeof StringInputFamily.InMessage.RequestedSet.Type,
    Readonly<{ _tag: 'RequestedSet'; value: string }>
  >
>
export type ExactFamilySilentOutput = Assert<
  Equal<
    Block.FactsOf<
      Block.FamilyContractOf<typeof StringInputFamily>
    >['operations']['requestClear']['outMessage'],
    never
  >
>
export type ExactFamilyReportedOutput = Assert<
  Equal<
    Block.FactsOf<
      Block.FamilyContractOf<typeof StringInputFamily>
    >['operations']['requestSet']['outMessage'],
    typeof StringInputFamily.OutMessage.Reported.Type
  >
>

export type SilentClear = Assert<
  Equal<Exclude<Results['clear']['outMessage'], undefined>, never>
>
export type SilentSet = Assert<
  Equal<Exclude<Results['set']['outMessage'], undefined>, never>
>
export type SilentSave = Assert<
  Equal<Exclude<Results['save']['outMessage'], undefined>, never>
>
export type ExactReport = Assert<
  Equal<
    Exclude<Results['report']['outMessage'], undefined>,
    typeof OutMessage.Reported.Type
  >
>
export type SilentChild = Assert<
  Equal<Exclude<ParentResults['clear']['outMessage'], undefined>, never>
>
export type ForwardedChildReport = Assert<
  Equal<
    Exclude<ParentResults['report']['outMessage'], undefined>,
    typeof ParentOutMessage.ChildReported.Type
  >
>
export type ExactInputSchema = Assert<
  Equal<typeof CounterContract.InMessage, typeof InMessage>
>
export type ClearBindingArguments = Assert<
  Equal<Parameters<typeof CounterBinding.requestClear>, []>
>
export type ConstructionRequirementsStaySeparate = Assert<
  Equal<Layer.Services<typeof CounterBlock.layer>, never>
>
export type ParentConstructionRequirements = Assert<
  Equal<Layer.Services<typeof ParentBlock.layer>, never>
>
export type ExplicitConstructionRequirement = Assert<
  Equal<Layer.Services<typeof FallibleCounterBlock.layer>, ConstructionInput>
>
export type ExplicitConstructionError = Assert<
  Equal<Layer.Error<typeof FallibleCounterBlock.layer>, ConstructionUnavailable>
>
export type HandlerService = Assert<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof CounterContract>['EffectsLayer']>,
    Storage
  >
>
export type HandlerError = Assert<
  Equal<
    Layer.Error<Block.ExecutableOf<typeof CounterContract>['EffectsLayer']>,
    HandlerUnavailable
  >
>
export type ParentHandlerService = Assert<
  Equal<
    Layer.Services<Block.ExecutableOf<typeof ParentContract>['EffectsLayer']>,
    Storage
  >
>
export type ProvidedGraphDoesNotBuildHandlers = Assert<
  Equal<Effect.Services<typeof receiveResults>, never>
>
export type InputOnlyHasNoDispatchMessages = Assert<
  Equal<Block.ExecutableOf<typeof InputOnlyContract>['Message']['Type'], never>
>
export type InputOnlyStillReceivesInputs = Assert<
  Equal<typeof InputOnlyContract.InMessage, typeof InputOnlyInMessage>
>

export const importedInMessageUpdate = makeInMessageUpdate({
  RequestedClear: makeStep(model => ({ model })),
  RequestedSetCount: makeFieldsStep.fromMessage(({ count }) => ({
    count: () => count,
  })),
  RequestedSave: makeCommandsStep.fromMessage(({ count }) => [Save({ count })]),
  RequestedReport: makeOutMessageStep.fromMessage(({ label }) =>
    OutMessage.Reported({ label }),
  ),
})
export const ImportedCounter = CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    inMessageUpdate: importedInMessageUpdate,
    EffectsLayer: Save.layer,
  }),
)

declare const counter: Block.ExecutableOf<typeof CounterContract>
declare const inputOnly: Block.ExecutableOf<typeof InputOnlyContract>
counter.inMessageUpdate({ count: 0, label: '' }, InMessage.RequestedClear())
counter.inMessageUpdate(InMessage.RequestedSetCount({ count: 2 }))({
  count: 0,
  label: '',
})
counter.operations.requestReport({ count: 0, label: '' }, { label: 'Count' })
CounterBinding.requestSetCount({ count: 3 })
inputOnly.operations.requestSetCount({ count: 0, label: '' }, {})
inputOnly.inMessageUpdate(
  { count: 0, label: '' },
  InputOnlyInMessage.RequestedClear(),
)

// @ts-expect-error Payload precision survives declaration relocation.
CounterBinding.requestSetCount({ count: 'wrong' })
