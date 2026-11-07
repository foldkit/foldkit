import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'

import {
  HostWindows,
  Ordinary,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  PlainWindows,
  QuoteWindows,
} from './query-policy.accepted.js'

declare const quotes: Block.ExecutableOf<typeof QuoteWindows>
declare const ordinary: Block.ExecutableOf<typeof Ordinary>
quotes.operations.requestLoadIfStale(
  quotes.init().model,
  // @ts-expect-error Fetch arguments preserve the declared numeric offset.
  { label: 'devin', offset: '0', limit: 60 },
  0,
)
// @ts-expect-error A freshness timestamp is required and numeric.
quotes.operations.requestLoadIfStale({ label: 'devin', offset: 0, limit: 60 })
// @ts-expect-error Cancellation keeps the declared argument contract.
quotes.operations.requestCancel(quotes.init().model, { label: 'devin' })
// @ts-expect-error An unkeyed Query has no keyed cancellation argument.
ordinary.operations.requestCancel(ordinary.init().model, { label: 'devin' })

const WithoutPolicy = ParentDefinition.makeRequiredFieldBinding(QuoteWindows, {
  field: 'quotes',
})
// @ts-expect-error Notifying Queries require an explicit OutMessage policy.
ParentDefinition.makeComposition({ bindings: [WithoutPolicy] })
// @ts-expect-error Plain Queries have no completion OutMessage constructor.
PlainWindows.OutMessage.CompletedFetch({})
QuoteWindows.OutMessage.CompletedFetch({
  args: { label: 'devin', offset: 0, limit: 60 },
  generation: 1,
  // @ts-expect-error The completion payload is the exact result Schema.
  result: 'success',
})
HostWindows.toLayer(
  // @ts-expect-error A keyed provider must accept the declared args and return the declared data.
  Effect.succeed((_args: { label: number }) => Effect.succeed('invalid')),
)

const UnregisteredKey = Symbol('UnregisteredQueryPolicy')
const Unregistered = Block.makeDefinition('UnregisteredQueryPolicy', {
  key: UnregisteredKey,
  InitArgs: Schema.Tuple([]),
  Model: ParentModel,
  Message: ParentMessage,
}).makeComposition()
declare const existingParentModel: typeof ParentModel.Type
// @ts-expect-error Connected operations require the exact registered Binding.
Unregistered.makeInit(() => ({
  model: existingParentModel,
  steps: [
    WithoutPolicy.requestCancel({ label: 'devin', offset: 0, limit: 60 }),
  ],
}))

const dynamic = Query.define({
  name: 'DynamicPolicy',
  args: { id: Schema.String },
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: Math.random() > 0.5,
})
// @ts-expect-error A runtime flag cannot erase a possible completion channel.
const erased: undefined = dynamic.OutMessage
void erased

// @ts-expect-error An explicit notifying contract requires the runtime flag.
const requiredFlag: Query.KeyedQueryConfig<
  'RequiredFlag',
  string,
  string,
  string,
  string,
  { readonly id: typeof Schema.String },
  true
> = {
  name: 'RequiredFlag',
  args: { id: Schema.String },
  data: Schema.String,
  error: Schema.String,
}
void requiredFlag

const dynamicOrdinary = Query.define({
  name: 'DynamicOrdinaryPolicy',
  data: Schema.String,
  error: Schema.String,
  notifyOnCompletion: Math.random() > 0.5,
})
const DynamicParentKey = Symbol('DynamicOrdinaryPolicyParent')
const DynamicParent = Block.makeDefinition('DynamicOrdinaryPolicyParent', {
  key: DynamicParentKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ query: dynamicOrdinary.Model }),
  Message: Schema.Never,
})
const DynamicBinding = DynamicParent.makeRequiredFieldBinding(dynamicOrdinary, {
  field: 'query',
})
// @ts-expect-error A possibly notifying Query requires a completion policy.
DynamicParent.makeComposition({ bindings: [DynamicBinding] })
