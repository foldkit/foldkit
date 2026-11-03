import { Effect, Schema } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'

import { Block as ChildBlock, Contract } from './basic'

const Model = Schema.Struct({ label: Schema.String })
export const SilentContractProofKey = Symbol('SilentContractProof')
export const SilentDefinition = Contracted.makeDefinition(
  'SilentContractProof',
  {
    key: SilentContractProofKey,
    Model,
    Message: Schema.Never,
    isMessageFree: true,
    Init: Schema.Tuple([Schema.String]),
    view: { kind: 'Element' },
  },
)
const Composition = SilentDefinition.makeComposition()
export const SilentBlock = SilentDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: Composition.makeInit(label => ({ model: { label } })),
    update: Composition.makeUpdate({}),
    view: Composition.makeView((model, h) => h.p([], [model.label])),
  }),
)

export const SilentParentContractProofKey = Symbol('SilentParentContractProof')
const ParentDefinition = Contracted.makeDefinition(
  'SilentParentContractProof',
  {
    key: SilentParentContractProofKey,
    Model: Schema.Struct({ child: SilentDefinition.contract.Model }),
    Message: Schema.Never,
    isMessageFree: true,
    Init: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)
const ChildBinding = ParentDefinition.makeBinding(SilentDefinition.contract, {
  field: 'child',
  init: { contextToArgs: () => ['Silent child'] },
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const SilentParentBlock = ParentDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: ParentComposition.makeInit(() => ({ model: {} })),
      update: ParentComposition.makeUpdate({}),
      view: ParentComposition.makeView((model, h) =>
        h.block(
          ChildBinding.embedView({ slotId: 'silent', model: model.child }),
        ),
      ),
    }
  }),
).provide(SilentBlock.layer)

type AssertNever<Value extends never> = Value
export type LeafDispatchIsNever = AssertNever<
  Contracted.CoreContract<typeof SilentBlock>['Message']['Type']
>
export type ParentDispatchIsNever = AssertNever<
  Contracted.CoreContract<typeof SilentParentBlock>['Message']['Type']
>

export const IncorrectSilentRoutedProofKey = Symbol(
  'IncorrectSilentRoutedProof',
)

export const routedBody = () => {
  const Definition = Contracted.makeDefinition('IncorrectSilentRoutedProof', {
    key: IncorrectSilentRoutedProofKey,
    Model: Schema.Struct({ child: Contract.Model }),
    Message: Schema.Never,
    isMessageFree: true,
    Init: Schema.Tuple([]),
  })
  const ChildBinding = Definition.makeBinding(Contract, {
    field: 'child',
    init: { contextToArgs: () => ['Routed'] },
  }).withOutMessagePolicy({
    fold: Definition.makeOutMessageFold(Contract, {
      Submitted: Definition.makeNoopStep,
    }),
  })
  const Composition = Definition.makeComposition({ bindings: [ChildBinding] })
  const constructor = Effect.gen(function* () {
    const child = yield* ChildBinding

    return {
      children: [child],
      init: Composition.makeInit(() => ({ model: {} })),
      update: Composition.makeUpdate({}),
    }
  })

  // @ts-expect-error Routed dispatch is not message-free even with no local Messages.
  Definition.makeBlock(constructor)

  return {
    definition: Definition,
    constructor,
    childLayer: ChildBlock.layer,
  }
}
