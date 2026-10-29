import { Schema } from 'effect'
import { Block, Update } from 'foldkit'

import {
  ContextCounterBlock,
  CounterBlock,
  DecoratedCounterBlock,
  LocalMessage,
  Model,
  OutMessage,
  ParentMessage,
  ParentModel,
  StringCounterBlock,
  conditionalContextUpdate,
  conditionalUpdate,
  contextualUpdate,
  makeGenericCounter,
  mixedConnectedLocalUpdate,
  update,
} from './record-update.accepted.js'

const model = Model.make({ count: 2 })
const quiet: Update.Return<typeof Model.Type, typeof LocalMessage.Type> =
  CounterBlock.operations.quiet(model)
const report = CounterBlock.operations.report(model, { amount: 3 })
const tupleReport: typeof report = CounterBlock.operations.reportAmount(
  model,
  3,
)
const contextualReport = ContextCounterBlock.operations.report(
  model,
  { amount: 3 },
  2,
)
const contextualTupleReport: typeof contextualReport =
  ContextCounterBlock.operations.reportAmount(model, 3, 2)
const curried = contextualUpdate(LocalMessage.RequestedQuiet())(model, 2)
const direct: typeof curried = contextualUpdate(
  model,
  LocalMessage.RequestedQuiet(),
  2,
)
const ordinary = update(model, LocalMessage.RequestedQuiet())
const conditionalReport = conditionalUpdate(
  model,
  LocalMessage.RequestedReport({ amount: 3 }),
)
const conditionalContextReport = conditionalContextUpdate(
  LocalMessage.RequestedReport({ amount: 3 }),
)(model, 2)
const parentModel = ParentModel.make({ child: model, count: 1 })
const mixedConnectedLocalResult = mixedConnectedLocalUpdate(
  parentModel,
  ParentMessage.RequestedQuiet(),
)
const mixedConnectedLocalOutMessage: typeof OutMessage.Type | undefined =
  mixedConnectedLocalResult.outMessage
// @ts-expect-error A conditional result must not erase the update to any.
const _invalidConditionalUpdate: string = conditionalUpdate
// @ts-expect-error A conditional context result must not erase the update to any.
const _invalidConditionalContextUpdate: string = conditionalContextUpdate
const text = StringCounterBlock.operations.report(
  { value: 'before' },
  { value: 'after' },
)
const LiteralCounterBlock = makeGenericCounter(Schema.Literal('Only'))
const literal = LiteralCounterBlock.operations.report(
  { value: 'Only' },
  { value: 'Only' },
)
const exact: 'Only' | undefined = literal.outMessage?.value
const decoratedTupleEmission: Block.OperationEmission<true> =
  DecoratedCounterBlock.operations.reportTuple
const decoratedConstructorEmission: Block.OperationEmission<true> =
  DecoratedCounterBlock.operations.reportConstructor

export {
  quiet,
  report,
  tupleReport,
  contextualReport,
  contextualTupleReport,
  curried,
  direct,
  ordinary,
  conditionalReport,
  conditionalContextReport,
  mixedConnectedLocalResult,
  mixedConnectedLocalOutMessage,
  text,
  literal,
  exact,
  decoratedTupleEmission,
  decoratedConstructorEmission,
}

import {
  defaultContextUpdate,
  optionalContextUpdate,
  requiredRestContextUpdate,
  restContextUpdate,
} from './record-update.accepted.js'
optionalContextUpdate(model, LocalMessage.RequestedReport({ amount: 2 }))
optionalContextUpdate(LocalMessage.RequestedReport({ amount: 2 }))(model, 3)
defaultContextUpdate(model, LocalMessage.RequestedReport({ amount: 2 }))
restContextUpdate(model, LocalMessage.RequestedReport({ amount: 2 }), 3, 4)
requiredRestContextUpdate(model, LocalMessage.RequestedReport({ amount: 2 }), 3)
