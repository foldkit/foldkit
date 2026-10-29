import { Effect, Layer, type Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'

import { Model } from './from-assembly.accepted.js'
import {
  CountComposition,
  EffectsLayer,
  init,
  prepareHeadless,
  prepareReportingViewed,
  prepareViewed,
  update,
  view,
} from './from-assembly.accepted.js'
import {
  BottomAnnotation,
  ErasedAnnotation,
  Headless,
  HeadlessBinding,
  OriginalParent,
  OriginalViewed,
  Parent,
  ParentBinding,
  ParentDefinition,
  RawParent,
  Viewed,
} from './from-assembly.accepted.js'

Block.assemble(() =>
  // @ts-expect-error An inline producer cannot infer the explicit Model boundary.
  CountComposition.prepareBlock({ init, update, view, EffectsLayer }),
)

// @ts-expect-error A never-producing annotation cannot satisfy AnyBlock.
export const ErasedAsBlock: Block.AnyBlock = ErasedAnnotation

// @ts-expect-error The never-producing annotation cannot register a child and erase Store.
ParentDefinition.makeBinding(ErasedAnnotation, { field: 'child', init: false })

// @ts-expect-error A never-producing annotation cannot complete a Program.
Program.makeElement({ block: ErasedAnnotation, container: null })

// @ts-expect-error The producer type itself cannot be never.
export const BottomAsBlock: Block.AnyBlock = BottomAnnotation

// @ts-expect-error A headless Block still needs an explicitly selected view.
HeadlessBinding.embedView({
  slotId: 'missing',
  model: Model.make({ count: 0 }),
})

// @ts-expect-error The default view retains its required label input.
ParentBinding.embedView({
  slotId: 'missing-inputs',
  model: Model.make({ count: 0 }),
})

// @ts-expect-error The projected operation retains the exact Message payload.
Viewed.operations.setCount(Model.make({ count: 0 }), { count: 'Wrong' })

// @ts-expect-error Replacing the local Layer cannot discard the Command and Mount handlers.
Viewed.replaceEffectsLayer(Layer.empty)

const parentProgram = Program.makeElement({ block: Parent, container: null })

// @ts-expect-error The ordinary Store remains required through the annotated child.
Runtime.run(parentProgram)

const originalParentProgram = Program.makeElement({
  block: OriginalParent,
  container: null,
})

// @ts-expect-error Store remains required for the full-contract root with a carrier child.
Runtime.run(originalParentProgram)

const rawParentProgram = Program.makeElement({
  block: RawParent,
  container: null,
})

// @ts-expect-error Store remains required when the root and child both retain their full contracts.
Runtime.run(rawParentProgram)

export const prepareWithUnknownLayer = () =>
  CountComposition.prepareBlock<
    typeof init,
    typeof update,
    typeof view,
    unknown
  >({
    init,
    update,
    view,
    // @ts-expect-error An explicit unknown Layer cannot establish Mount handler completeness.
    EffectsLayer,
  })

const setCount = Viewed.operations.setCount(Model.make({ count: 0 }), {
  count: 1,
})

for (const command of setCount.commands ?? []) {
  // @ts-expect-error A returned Command still requires its runtime handler service.
  Effect.runPromise(command.effect)
}

declare const nonCallableProducer: number
export type NonCallableAnnotation = Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error A non-callable producer cannot instantiate the annotation.
  typeof nonCallableProducer
>
declare const unknownProducer: unknown
export type UnknownProducerAnnotation = Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error An unknown producer cannot instantiate the annotation.
  typeof unknownProducer
>
declare const unknownResultProducer: () => unknown
export type UnknownResultAnnotation = Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error An unknown result cannot instantiate the annotation.
  typeof unknownResultProducer
>
declare const anyResultProducer: () => any
export const AnyResultAnnotation: Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error An any result cannot instantiate the annotation or bypass the producer check through its RHS.
  typeof anyResultProducer
> = anyResultProducer()
declare const anyProducer: any
// @ts-expect-error An entirely any producer makes the annotation never, rejecting the any RHS.
export const AnyProducerAnnotation: Block.FromAssemblyWithView<
  typeof Model,
  typeof anyProducer
> = anyProducer()

export const MutableBroadHeader: Schema.Codec<
  { count: number | string },
  { count: number | string }
> = Model
export type UncheckedHeader<Header> = Omit<typeof OriginalViewed, 'Model'> &
  Readonly<{ Model: Header }>
export const OldCovariantAcceptance: UncheckedHeader<
  typeof MutableBroadHeader
> = OriginalViewed
export const CovariantAnnotation: Block.FromAssemblyWithView<
  typeof MutableBroadHeader,
  // @ts-expect-error A broader mutable decoded/encoded Model cannot replace the assembly's exact Schema.
  typeof prepareViewed
> = OriginalViewed
export const MutableExactHeader: Schema.Codec<
  { count: number },
  { count: number }
> = Model
export const OldMutableAcceptance: UncheckedHeader<typeof MutableExactHeader> =
  OriginalViewed
export const MutableAnnotation: Block.FromAssemblyWithView<
  typeof MutableExactHeader,
  // @ts-expect-error A structurally assignable but different mutable Schema header cannot replace the assembly Schema.
  typeof prepareViewed
> = OriginalViewed
export const AnyModelAnnotation: Block.FromAssemblyWithView<
  any,
  // @ts-expect-error A completely any Model Schema cannot disable header agreement.
  typeof prepareViewed
> = OriginalViewed

// @ts-expect-error Headless assembly cannot acquire a default view through an annotation.
export const InventedView: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareHeadless
> = Headless
// @ts-expect-error A view-capable assembly cannot claim no default view.
export const ErasedView: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareViewed
> = OriginalViewed
// @ts-expect-error A reporting assembly cannot erase its OutMessage Schema.
export const ErasedOutMessage: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepareReportingViewed
> = Block.assemble(prepareReportingViewed)
// @ts-expect-error A plain assembly cannot invent an OutMessage Schema.
export const InventedOutMessage: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareViewed
> = OriginalViewed

declare const unionProducer: () =>
  | ReturnType<typeof prepareViewed>
  | ReturnType<typeof prepareHeadless>
export type UnionAnnotation = Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error A union producer is rejected instead of losing cross-member capability correlations.
  typeof unionProducer
>

const prepareExtended = () => Object.assign(prepareViewed(), { test: true })
export type ExtendedAnnotation = Block.FromAssemblyWithView<
  typeof Model,
  // @ts-expect-error Extra fields must be added after the checked plain assembly annotation.
  typeof prepareExtended
>
export type ExtendedCarrier = Block.AssemblyWithView<
  typeof Model,
  // @ts-expect-error Public declaration support retains the same exact completed-key requirement.
  typeof prepareExtended
>
