import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  CounterComposition,
  incrementAndSaveStep,
  reportChildStep,
} from './message-steps.accepted.js'
import {
  CounterDefinition,
  Message,
  Model,
  makeStep,
} from './message-steps.definition.js'
import {
  ChildBinding,
  ParentComposition,
  ParentDefinition,
  ParentModel,
} from './record-update.accepted.js'

incrementAndSaveStep(
  Model.make({ count: 0 }),
  // @ts-expect-error A Model-first handler retains the exact Message variant.
  Message.RequestedReport({ label: 'wrong' }),
)
// @ts-expect-error A Message-only producer cannot require a second argument.
makeStep.fromMessage((_message: typeof Message.Type, extra: string) => ({
  model: { count: extra.length },
}))
// @ts-expect-error An erased Message parameter cannot supply the owning Message contract.
makeStep.fromMessage((_message: any) => ({ model: { count: 0 } }))
// @ts-expect-error A producer requiring an impossible Message cannot be applied.
makeStep.fromMessage((_message: never) => CounterDefinition.makeNoopStep())
// @ts-expect-error A producer cannot require a narrower payload than its complete owning Message variant.
makeStep.fromMessage(
  (_message: typeof Message.RequestedIncrement.Type & { amount: 1 }) => ({
    model: { count: 0 },
  }),
)
declare const erased: any
// @ts-expect-error Erased output cannot prove result channels.
makeStep.fromMessage(() => erased)
// @ts-expect-error Never output cannot prove result channels.
makeStep.fromMessage((): never => {
  throw new Error('unreachable')
})
// @ts-expect-error A different Model cannot be returned.
makeStep.fromMessage(() => ({ model: { count: 'wrong' } }))
// @ts-expect-error Deferred Steps must accept the owning Model.
makeStep.fromMessage(() => (_model: { other: string }) => ({
  model: { count: 0 },
}))
// @ts-expect-error An erased deferred result cannot prove its channels.
makeStep.fromMessage(() => (_model: typeof Model.Type) => erased)
declare const isFirstBranch: boolean
const invalidFunctionBranch = () =>
  isFirstBranch
    ? CounterDefinition.makeNoopStep()
    : (model: { other: string }) => ({ model })
// @ts-expect-error Every deferred function branch must accept the owning Model.
makeStep.fromMessage(invalidFunctionBranch)
// @ts-expect-error Ordinary Step producers validate every function branch too.
makeStep(invalidFunctionBranch)
const invalidResultBranch = () => (model: typeof Model.Type) =>
  isFirstBranch ? { model } : { model: { other: 'wrong' } }
// @ts-expect-error A returned Step cannot hide an invalid Model beside a valid one.
makeStep.fromMessage(invalidResultBranch)
// @ts-expect-error Ordinary deferred Steps cannot hide invalid result branches.
makeStep(invalidResultBranch)
const refinedProducer = (
  _message: typeof Message.RequestedIncrement.Type & { extra: number },
) => CounterDefinition.makeNoopStep()
// @ts-expect-error Explicit any Message arguments cannot erase an unsafe refinement.
makeStep.fromMessage<any, typeof refinedProducer>(refinedProducer)
// @ts-expect-error Async producers cannot supply synchronous results or Steps.
makeStep.fromMessage(async () => ({ model: { count: 0 } }))
makeStep.fromMessage(() => ({
  model: { count: 0 },
  // @ts-expect-error A foreign OutMessage is rejected.
  outMessage: { _tag: 'Foreign' },
}))

const ForeignMessage = defineMessageUnion({ CompletedForeign: {} })
const ForeignDefinition = Block.makeDefinition('MessageOnlyForeign', {
  Model,
  Message: ForeignMessage,
})
const Foreign = ForeignDefinition.makeCommand('Foreign', {
  messages: [ForeignMessage.CompletedForeign],
})
// @ts-expect-error A foreign Command result Message is rejected.
makeStep.fromMessage(() => ({ model: { count: 0 }, commands: [Foreign()] }))

const wrongTagStep = makeStep.fromMessage(
  (_message: typeof Message.RequestedReport.Type) =>
    CounterDefinition.makeNoopStep(),
)
const ordinaryWrongTagStep = makeStep(
  (model, _message: typeof Message.RequestedReport.Type) => ({ model }),
)
CounterComposition.makeUpdate({
  // @ts-expect-error A Model-aware Step cannot be installed under another Message tag.
  RequestedIncrement: ordinaryWrongTagStep,
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
CounterComposition.makeUpdate({
  // @ts-expect-error Installing the handler under a different tag cannot change its accepted Message.
  RequestedIncrement: wrongTagStep,
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
// @ts-expect-error Required Command handlers cannot be omitted during assembly.
CounterComposition.prepareBlock({
  init: CounterComposition.makeInit(() => ({ model: { count: 0 } })),
  update: CounterComposition.makeUpdate({
    RequestedIncrement: incrementAndSaveStep,
    RequestedReport: CounterDefinition.makeNoopStep(),
    CompletedSave: CounterDefinition.makeNoopStep(),
  }),
})

// @ts-expect-error A raw Model does not establish child registration.
reportChildStep(ParentModel.make({ child: { count: 0 }, count: 0 }), {
  _tag: 'RequestedReport',
})
const UnregisteredComposition = ParentDefinition.makeComposition()
UnregisteredComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  // @ts-expect-error Message-only authoring preserves the child's registration requirement.
  RequestedReport: reportChildStep,
  RequestedSave: ParentDefinition.makeNoopStep(),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
const lossyStep = ParentDefinition.makeStep.fromMessage(() =>
  Update.combineSteps([
    ParentDefinition.makeNoopStep(),
    ChildBinding.report({ amount: 1 }),
  ]),
)
ParentComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  // @ts-expect-error Sequential Steps cannot silently drop a connected OutMessage.
  RequestedReport: lossyStep,
  RequestedSave: ParentDefinition.makeNoopStep(),
  CompletedSave: ParentDefinition.makeNoopStep(),
})

CounterComposition.makeUpdate({
  // @ts-expect-error Inline Step inference does not permit an erased Message parameter.
  RequestedIncrement: makeStep((model, _message: any) => ({ model })),
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
CounterComposition.makeUpdate({
  // @ts-expect-error A handler must accept its complete Message variant.
  RequestedIncrement: makeStep(
    (
      model,
      _message: typeof Message.RequestedIncrement.Type & { amount: 1 },
    ) => ({ model }),
  ),
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
CounterComposition.makeUpdate({
  // @ts-expect-error A handler cannot require an impossible Message.
  RequestedIncrement: makeStep((model, _message: never) => ({ model })),
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
CounterComposition.makeUpdate({
  // @ts-expect-error Contextual Message inference does not allow erased result channels.
  RequestedIncrement: makeStep((_model, _message) => erased),
  RequestedReport: CounterDefinition.makeNoopStep(),
  CompletedSave: CounterDefinition.makeNoopStep(),
})
UnregisteredComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  // @ts-expect-error Inline Model-aware Steps preserve child registration requirements.
  RequestedReport: ParentDefinition.makeStep((model, _message) =>
    ChildBinding.report({ amount: model.count }),
  ),
  RequestedSave: ParentDefinition.makeNoopStep(),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
ParentComposition.makeUpdate({
  RequestedQuiet: ParentDefinition.makeNoopStep(),
  // @ts-expect-error Inline Model-aware composition cannot discard connected OutMessages.
  RequestedReport: ParentDefinition.makeStep((model, _message) =>
    Update.combineSteps([
      ParentDefinition.makeNoopStep(),
      ChildBinding.report({ amount: model.count }),
    ]),
  ),
  RequestedSave: ParentDefinition.makeNoopStep(),
  CompletedSave: ParentDefinition.makeNoopStep(),
})
