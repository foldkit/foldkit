import { Effect, Layer, Schema, Tuple } from 'effect'
import * as Contracted from 'foldkit/experimental/contracted'

import {
  Block,
  ChildBinding,
  Contract,
  Definition,
  Message,
  ParentBlock,
  ParentDefinition,
  ParentLayer,
  Send,
  init,
  update,
  view,
} from './basic'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false
type Assert<Value extends true> = Value
export type PublicContractHasNoLayer = Assert<
  Equal<'layer' extends keyof typeof Contract ? true : false, false>
>
export type ParentRequiresChild = Assert<
  Equal<
    Layer.Services<typeof ParentBlock.layer>,
    Layer.Success<typeof Block.layer>
  >
>
export type ProvidedParentNeedsNoConstructorService = Assert<
  Equal<Layer.Services<typeof ParentLayer>, never>
>
export type LazyHandlerKeepsSend = Assert<
  Equal<Contracted.FactsOf<typeof ParentBlock>['programRequirements'], Send>
>

ChildBinding.clear()
ChildBinding.submit()
// @ts-expect-error The child's clear operation has no payload.
ChildBinding.clear({ text: 'Wrong' })
// @ts-expect-error Public operations are declared explicitly.
ChildBinding.unknown()
// @ts-expect-error A Binding requires a field containing this child Model.
ParentDefinition.makeBinding(Contract, { field: 'lastSubmitted' })
// @ts-expect-error OutMessage policies are exhaustive.
ParentDefinition.makeOutMessageFold(Contract, {})
// @ts-expect-error Bound input payloads stay exact.
Message.UpdatedText({ text: 1 })

Effect.gen(function* () {
  const block = yield* Contract.get
  block.init('One')
  // @ts-expect-error Init inputs come from the independent tuple Schema.
  block.init(1)
})

const Composition = Definition.makeComposition()
const body = { children: Tuple.make(), init, update, view }
Definition.makeBlock(Effect.succeed(body))

// @ts-expect-error A constructor cannot repeat its contract's operations inventory.
Definition.makeBlock(Effect.succeed({ ...body, operations: {} }))

declare const optionalOperationsBody: typeof body &
  Readonly<{ operations?: Readonly<Record<never, never>> }>
// @ts-expect-error An optional operations inventory also duplicates the contract declaration.
Definition.makeBlock(Effect.succeed(optionalOperationsBody))

declare const unionOperationsBody:
  | typeof body
  | (typeof body & Readonly<{ operations: Readonly<Record<never, never>> }>)
// @ts-expect-error Every possible constructor body must omit the duplicate operations inventory.
Definition.makeBlock(Effect.succeed(unionOperationsBody))

declare const overloadedInit: {
  (value: string): { model: { text: string } }
  (value: number): { model: { text: string } }
}
// @ts-expect-error Initializers retain native single-signature validation.
Composition.makeInit(overloadedInit)
const decoratedInit = Object.assign((text: string) => ({ model: { text } }), {
  extra: true,
})
// @ts-expect-error Extra function members cannot erase the initializer's concrete evidence.
Composition.makeInit(decoratedInit)

type DifferentFacts = Omit<Contracted.FactsOf<typeof Contract>, 'initArgs'> &
  Readonly<{ initArgs: readonly [number] }>

export const differentContractFactsDoNotSupplyTheOriginal = (
  different: Layer.Layer<
    Contracted.ContractGraph<
      typeof Contract.owner,
      typeof Contract.Model,
      typeof Contract.Message,
      typeof Contract.OutMessage,
      DifferentFacts
    >
  >,
) => {
  // @ts-expect-error A provider for different startup facts cannot satisfy this contract.
  Effect.runPromise(Contract.get.pipe(Effect.provide(different)))
}

export const ContractIdControlKey = Symbol('ContractIdControl')
const contractConfig = Object.freeze({
  key: ContractIdControlKey,
  Model: Contract.Model,
  Message,
  Init: Schema.Tuple([]),
})

export const declareContractWithUnionId = (id: 'First' | 'Second') => {
  // @ts-expect-error A union Id cannot distinguish independent provider capabilities.
  Contracted.makeDefinition(id, contractConfig)
}

export const declareContractWithStringId = (id: string) => {
  // @ts-expect-error Independent contracts require a concrete singleton Id.
  Contracted.makeDefinition(id, contractConfig)
}

// @ts-expect-error Independent contract Ids cannot be empty.
Contracted.makeDefinition('', contractConfig)
