import { Effect, Layer } from 'effect'
import { Block, Program, Runtime } from 'foldkit'

import { EffectsLayer, Model, Store } from './from-assembly.accepted.js'
import { view } from './from-assembly.accepted.js'
import {
  BottomAnnotation,
  ErasedAnnotation,
  Headless,
  HeadlessBinding,
  OriginalErased,
  OriginalHeadless,
  OriginalParent,
  OriginalReportingHeadless,
  OriginalReportingViewed,
  OriginalViewed,
  Parent,
  ParentBinding,
  ParentComposition,
  ParentDefinition,
  RawParent,
  ReportingHeadless,
  ReportingViewed,
  Viewed,
  replaceOriginalViewed,
  replaceViewed,
} from './from-assembly.accepted.js'
import type {
  Assert,
  Equal,
  RequiredKeys,
  SameMembers,
} from './from-assembly.assertions.js'

export type ViewedMembers = Assert<
  SameMembers<typeof Viewed, typeof OriginalViewed>
>
export type HeadlessMembers = Assert<
  SameMembers<typeof Headless, typeof OriginalHeadless>
>
export type ReportingViewedMembers = Assert<
  SameMembers<typeof ReportingViewed, typeof OriginalReportingViewed>
>
export type ReportingHeadlessMembers = Assert<
  SameMembers<typeof ReportingHeadless, typeof OriginalReportingHeadless>
>
export type ParentMembers = Assert<
  SameMembers<typeof Parent, typeof OriginalParent>
>

export type ViewedPresence = Assert<
  Equal<RequiredKeys<typeof Viewed>, RequiredKeys<typeof OriginalViewed>>
>
export type HeadlessPresence = Assert<
  Equal<RequiredKeys<typeof Headless>, RequiredKeys<typeof OriginalHeadless>>
>
export type ReportingViewedPresence = Assert<
  Equal<
    RequiredKeys<typeof ReportingViewed>,
    RequiredKeys<typeof OriginalReportingViewed>
  >
>
export type ReportingHeadlessPresence = Assert<
  Equal<
    RequiredKeys<typeof ReportingHeadless>,
    RequiredKeys<typeof OriginalReportingHeadless>
  >
>

export const ViewedToOriginal: typeof OriginalViewed = Viewed
export const OriginalToViewed: typeof Viewed = OriginalViewed
export const HeadlessToOriginal: typeof OriginalHeadless = Headless
export const OriginalToHeadless: typeof Headless = OriginalHeadless
export const ReportingViewedToOriginal: typeof OriginalReportingViewed =
  ReportingViewed
export const OriginalToReportingViewed: typeof ReportingViewed =
  OriginalReportingViewed
export const ReportingHeadlessToOriginal: typeof OriginalReportingHeadless =
  ReportingHeadless
export const OriginalToReportingHeadless: typeof ReportingHeadless =
  OriginalReportingHeadless

export const ReplacedOriginalViewed = replaceOriginalViewed(EffectsLayer)
export const ReplacedViewed = replaceViewed(EffectsLayer)

// @ts-expect-error The extracted checked callable with the full contract cannot discard the Command and Mount handlers.
replaceOriginalViewed(Layer.empty)
// @ts-expect-error The extracted checked callable cannot discard the Command and Mount handlers.
replaceViewed(Layer.empty)

export type ReplacedOriginalViewedMembers = Assert<
  SameMembers<typeof ReplacedOriginalViewed, typeof OriginalViewed>
>
export type ReplacedViewedMembers = Assert<
  SameMembers<typeof ReplacedViewed, typeof Viewed>
>
export type ReplacedOriginalViewedStore = Assert<
  Equal<Layer.Services<typeof ReplacedOriginalViewed.EffectsLayer>, Store>
>
export type ReplacedViewedStore = Assert<
  Equal<Layer.Services<typeof ReplacedViewed.EffectsLayer>, Store>
>
export type ReplacedOriginalViewedOperationArguments = Assert<
  Equal<
    Parameters<typeof ReplacedOriginalViewed.operations.setCount>,
    Parameters<typeof OriginalViewed.operations.setCount>
  >
>
export type ReplacedViewedOperationArguments = Assert<
  Equal<
    Parameters<typeof ReplacedViewed.operations.setCount>,
    Parameters<typeof Viewed.operations.setCount>
  >
>

export type ParentBindings = Assert<
  Equal<typeof Parent.bindings, typeof ParentComposition.bindings>
>
export type ParentDispatch = Assert<
  SameMembers<typeof Parent.Message, typeof ParentComposition.Message>
>
export type ParentStore = Assert<
  Equal<Layer.Services<typeof Parent.EffectsLayer>, Store>
>
export type OriginalParentStore = Assert<
  Equal<Layer.Services<typeof OriginalParent.EffectsLayer>, Store>
>
export type RawParentStore = Assert<
  Equal<Layer.Services<typeof RawParent.EffectsLayer>, Store>
>
export type OperationArguments = Assert<
  Equal<
    Parameters<typeof Viewed.operations.setCount>,
    Parameters<typeof OriginalViewed.operations.setCount>
  >
>
export type OperationReturn = Assert<
  Equal<
    ReturnType<typeof Viewed.operations.setCount>,
    ReturnType<typeof OriginalViewed.operations.setCount>
  >
>

export type ErasedWasNever = Assert<Equal<typeof OriginalErased, never>>
export type ErasedModelRemainsKnown = Assert<
  Equal<typeof ErasedAnnotation.Model, typeof Model>
>
export type BottomModelRemainsKnown = Assert<
  Equal<typeof BottomAnnotation.Model, typeof Model>
>

export const DefaultEmbedding = ParentBinding.embedView({
  slotId: 'default',
  model: Model.make({ count: 0 }),
  viewInputs: { label: 'Default' },
})

export const HeadlessEmbedding = HeadlessBinding.embedView({
  slotId: 'headless',
  model: Model.make({ count: 0 }),
  view,
  viewInputs: { label: 'Alternate' },
})

export const ReplacedViewedBinding = ParentDefinition.makeBinding(
  ReplacedViewed,
  { field: 'child' },
)
export const ReplacedViewedParentComposition = ParentDefinition.makeComposition(
  { bindings: [ReplacedViewedBinding] },
)
const prepare = () =>
  ReplacedViewedParentComposition.prepareBlock({
    init: ReplacedViewedParentComposition.makeInit(() => ({ model: {} })),
    update: ReplacedViewedParentComposition.makeUpdate({}),
    view: ReplacedViewedParentComposition.makeView((model, h) =>
      h.block(
        ReplacedViewedBinding.embedView({
          slotId: 'replaced-child',
          model: model.child,
          viewInputs: { label: 'Replaced count' },
        }),
      ),
    ),
  })
export const ReplacedViewedParent: Block.FromAssemblyWithView<
  typeof ParentDefinition.Model,
  typeof prepare
> = Block.assemble(prepare)

export const ProgramWithStoreRequirement = Program.makeElement({
  block: Parent,
  container: null,
})

export const OriginalParentProgramWithStoreRequirement = Program.makeElement({
  block: OriginalParent,
  container: null,
})

export const RawParentProgramWithStoreRequirement = Program.makeElement({
  block: RawParent,
  container: null,
})

export const ReplacedViewedProgramWithStoreRequirement = Program.makeElement({
  block: ReplacedViewedParent,
  container: null,
})

export const StoreLayer = Layer.succeed(Store, {
  saveCount: () => Effect.void,
})

Runtime.run(ProgramWithStoreRequirement.provide(StoreLayer))
Runtime.run(OriginalParentProgramWithStoreRequirement.provide(StoreLayer))
Runtime.run(RawParentProgramWithStoreRequirement.provide(StoreLayer))
// @ts-expect-error The replacement retains the Store Service requirement.
Runtime.run(ReplacedViewedProgramWithStoreRequirement)
Runtime.run(ReplacedViewedProgramWithStoreRequirement.provide(StoreLayer))
