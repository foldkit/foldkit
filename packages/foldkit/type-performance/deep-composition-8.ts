import { Context, Effect, Layer, Option, Schema } from 'effect'
import { Program } from 'foldkit'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type { Element as ElementProgram } from 'foldkit/program'
import type * as Update from 'foldkit/update'

const WarmupModel = Schema.Struct({ value: Schema.Number })
const WarmupMessage = defineMessageUnion({ CompletedWarmup: {} })

// oxlint-disable-next-line effecttsgo/floating-effect
Effect.void
Layer.empty
Option.none()
Block.makeDefinition('Application', {
  Model: WarmupModel,
  Message: WarmupMessage,
})
Context.Service
Block.makeDefinition('TypePerformanceWarmup', {
  Model: WarmupModel,
  Message: WarmupMessage,
})

export type WarmupStep = Update.Step<
  typeof WarmupModel.Type,
  typeof WarmupMessage.Type
>
export type WarmupElement = ElementProgram

const LeafModel = Schema.Struct({ value: Schema.Number })
type LeafModel = typeof LeafModel.Type

const LeafMessage = defineMessageUnion({ RequestedRun: {}, CompletedRun: {} })
type LeafMessage = typeof LeafMessage.Type

class Clock extends Context.Service<
  Clock,
  Readonly<{ run: Effect.Effect<void> }>
>()('TypePerformanceDeepLeafClock') {}
const ClockLayer = Layer.succeed(Clock, { run: Effect.void })

const TypePerformanceDeepLeafDefinition = Block.makeDefinition(
  'TypePerformanceDeepLeaf',
  {
    Model: LeafModel,
    Message: LeafMessage,
  },
)
const RunLeaf = TypePerformanceDeepLeafDefinition.makeCommand('RunLeaf', {
  messages: [LeafMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(LeafMessage.CompletedRun()))
  },
})
const runLeaf = TypePerformanceDeepLeafDefinition.makeStep(model => ({
  model,
  commands: [RunLeaf()],
}))
const TypePerformanceDeepLeafComposition =
  TypePerformanceDeepLeafDefinition.makeComposition()
const prepareLeaf = () =>
  TypePerformanceDeepLeafComposition.prepareBlock({
    init: TypePerformanceDeepLeafComposition.makeInit(() => ({
      model: LeafModel.make({ value: 0 }),
    })),
    update: TypePerformanceDeepLeafComposition.makeUpdate({
      RequestedRun: model => runLeaf(model),
      CompletedRun: model => ({ model }),
    }),
    operations: {
      runLeaf: LeafMessage.RequestedRun,
    },
    EffectsLayer: RunLeaf.layer,
  })
const Leaf: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLeaf
> = Block.assemble(prepareLeaf)

const TypePerformanceLevel001Definition = Block.makeDefinition(
  'TypePerformanceLevel001',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child001Binding = TypePerformanceLevel001Definition.makeBinding(Leaf, {
  placement: 'child001',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
})
const TypePerformanceLevel001Composition =
  TypePerformanceLevel001Definition.makeComposition({
    bindings: [Child001Binding],
  })
const prepareLevel001 = () =>
  TypePerformanceLevel001Composition.prepareBlock({
    init: TypePerformanceLevel001Composition.makeInit(() =>
      Child001Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel001Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level001: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel001
> = Block.assemble(prepareLevel001)

const TypePerformanceLevel002Definition = Block.makeDefinition(
  'TypePerformanceLevel002',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child002Binding = TypePerformanceLevel002Definition.makeBinding(
  Level001,
  {
    placement: 'child002',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel002Composition =
  TypePerformanceLevel002Definition.makeComposition({
    bindings: [Child002Binding],
  })
const prepareLevel002 = () =>
  TypePerformanceLevel002Composition.prepareBlock({
    init: TypePerformanceLevel002Composition.makeInit(() =>
      Child002Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel002Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level002: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel002
> = Block.assemble(prepareLevel002)

const TypePerformanceLevel003Definition = Block.makeDefinition(
  'TypePerformanceLevel003',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child003Binding = TypePerformanceLevel003Definition.makeBinding(
  Level002,
  {
    placement: 'child003',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel003Composition =
  TypePerformanceLevel003Definition.makeComposition({
    bindings: [Child003Binding],
  })
const prepareLevel003 = () =>
  TypePerformanceLevel003Composition.prepareBlock({
    init: TypePerformanceLevel003Composition.makeInit(() =>
      Child003Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel003Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level003: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel003
> = Block.assemble(prepareLevel003)

const TypePerformanceLevel004Definition = Block.makeDefinition(
  'TypePerformanceLevel004',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child004Binding = TypePerformanceLevel004Definition.makeBinding(
  Level003,
  {
    placement: 'child004',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel004Composition =
  TypePerformanceLevel004Definition.makeComposition({
    bindings: [Child004Binding],
  })
const prepareLevel004 = () =>
  TypePerformanceLevel004Composition.prepareBlock({
    init: TypePerformanceLevel004Composition.makeInit(() =>
      Child004Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel004Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level004: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel004
> = Block.assemble(prepareLevel004)

const TypePerformanceLevel005Definition = Block.makeDefinition(
  'TypePerformanceLevel005',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child005Binding = TypePerformanceLevel005Definition.makeBinding(
  Level004,
  {
    placement: 'child005',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel005Composition =
  TypePerformanceLevel005Definition.makeComposition({
    bindings: [Child005Binding],
  })
const prepareLevel005 = () =>
  TypePerformanceLevel005Composition.prepareBlock({
    init: TypePerformanceLevel005Composition.makeInit(() =>
      Child005Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel005Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level005: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel005
> = Block.assemble(prepareLevel005)

const TypePerformanceLevel006Definition = Block.makeDefinition(
  'TypePerformanceLevel006',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child006Binding = TypePerformanceLevel006Definition.makeBinding(
  Level005,
  {
    placement: 'child006',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel006Composition =
  TypePerformanceLevel006Definition.makeComposition({
    bindings: [Child006Binding],
  })
const prepareLevel006 = () =>
  TypePerformanceLevel006Composition.prepareBlock({
    init: TypePerformanceLevel006Composition.makeInit(() =>
      Child006Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel006Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level006: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel006
> = Block.assemble(prepareLevel006)

const TypePerformanceLevel007Definition = Block.makeDefinition(
  'TypePerformanceLevel007',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child007Binding = TypePerformanceLevel007Definition.makeBinding(
  Level006,
  {
    placement: 'child007',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel007Composition =
  TypePerformanceLevel007Definition.makeComposition({
    bindings: [Child007Binding],
  })
const prepareLevel007 = () =>
  TypePerformanceLevel007Composition.prepareBlock({
    init: TypePerformanceLevel007Composition.makeInit(() =>
      Child007Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel007Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level007: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel007
> = Block.assemble(prepareLevel007)

const TypePerformanceLevel008Definition = Block.makeDefinition(
  'TypePerformanceLevel008',
  {
    Model: LeafModel,
    Message: Schema.Never,
  },
)
const Child008Binding = TypePerformanceLevel008Definition.makeBinding(
  Level007,
  {
    placement: 'child008',
    read: model => Option.some(model),
    write: (_model, nextChild) => nextChild,
  },
)
const TypePerformanceLevel008Composition =
  TypePerformanceLevel008Definition.makeComposition({
    bindings: [Child008Binding],
  })
const prepareLevel008 = () =>
  TypePerformanceLevel008Composition.prepareBlock({
    init: TypePerformanceLevel008Composition.makeInit(() =>
      Child008Binding.init({ args: [], toParentModel: model => model }),
    ),
    update: TypePerformanceLevel008Composition.makeUpdate({}),
    EffectsLayer: Layer.empty,
  })
const Level008: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof LeafModel,
  typeof prepareLevel008
> = Block.assemble(prepareLevel008)

const ApplicationMessage = Schema.Never
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: LeafModel,
  Message: ApplicationMessage,
})
const Child008RootBinding = ApplicationDefinition.makeBinding(Level008, {
  placement: 'child008Root',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [Child008RootBinding],
})
const update = ApplicationComposition.makeUpdate({})
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

const prepareApplicationBlock = () =>
  ApplicationComposition.prepareBlock({
    init: ApplicationComposition.makeInit(() =>
      Child008RootBinding.init({ args: [], toParentModel: model => model }),
    ),
    update,
    view,
    EffectsLayer: Layer.empty,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof LeafModel,
  typeof prepareApplicationBlock
> = Block.assemble(prepareApplicationBlock)

export const program = Program.makeElement({
  block: ApplicationBlock,
  container: null,
})
export const providedProgram = program.provide(ClockLayer)

export type ApplicationRequirements = Update.RequirementsOf<typeof update>
export type Program = typeof program
type RequirementsOf<Value> =
  Value extends ElementProgram<
    undefined,
    infer Requirements,
    never,
    infer _ProvidedServices
  >
    ? Requirements
    : never
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type ProgramRequirementsAreClock = Expect<
  Equal<RequirementsOf<typeof program>, Clock>
>
type ProvidedRequirementsAreComplete = Expect<
  Equal<RequirementsOf<typeof providedProgram>, never>
>
export type Assertions = [
  ProgramRequirementsAreClock,
  ProvidedRequirementsAreComplete,
]
