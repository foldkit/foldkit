import { Effect, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'

import { Block, Contract } from '../contract-provisioning-proof/src/basic'

export const RoutedOnlyContractReviewKey = Symbol('RoutedOnlyContractReview')
const Definition = Contracted.makeDefinition('RoutedOnlyContractReview', {
  key: RoutedOnlyContractReviewKey,
  Model: Schema.Struct({ child: Contract.Model }),
  Message: Schema.Never,
  Init: Schema.Tuple([]),
})
export const RoutedChildBinding = Definition.makeBinding(Contract, {
  field: 'child',
  init: { contextToArgs: () => ['Initial'] },
}).withOutMessagePolicy({
  fold: Definition.makeOutMessageFold(Contract, {
    Submitted: () => Definition.makeNoopStep(),
  }),
})
const Composition = Definition.makeComposition({
  bindings: [RoutedChildBinding],
})
export const RoutedOnlyBlock = Definition.makeBlock(
  Effect.gen(function* () {
    const child = yield* RoutedChildBinding

    return {
      children: [child],
      init: Composition.makeInit(() => ({ model: {} })),
      update: Composition.makeUpdate({}),
    }
  }),
)
export const ProvidedRoutedOnlyBlock = RoutedOnlyBlock.provide(Block.layer)

type Assert<Value extends true> = Value
export type HasRoutedDispatch = Assert<
  Contracted.FactsOf<typeof RoutedOnlyBlock>['isMessageFree'] extends false
    ? true
    : false
>
