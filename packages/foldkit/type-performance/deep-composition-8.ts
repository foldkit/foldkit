import { Context, Effect, Layer, Option, Schema } from 'effect'
import { defineApplication } from 'foldkit'
import type { Element as ElementProgram } from 'foldkit/application'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import type * as Update from 'foldkit/update'

const WarmupModel = Schema.Struct({ value: Schema.Number })
const WarmupMessage = defineMessageUnion({ CompletedWarmup: {} })

// oxlint-disable-next-line effecttsgo/floating-effect
Effect.void
Layer.empty
Option.none()
defineApplication({ Model: WarmupModel, Message: WarmupMessage })
Context.Service
Block.define('TypePerformanceWarmup', {
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

const TypePerformanceDeepLeaf = Block.define('TypePerformanceDeepLeaf', {
  Model: LeafModel,
  Message: LeafMessage,
})
const RunLeaf = TypePerformanceDeepLeaf.command('RunLeaf', {
  messages: [LeafMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(LeafMessage.CompletedRun()))
  },
})
const runLeaf = TypePerformanceDeepLeaf.step(model => ({
  model,
  commands: [RunLeaf()],
}))
const TypePerformanceDeepLeafComposition =
  TypePerformanceDeepLeaf.makeComposition()
const Leaf = TypePerformanceDeepLeafComposition.makeBlock({
  init: TypePerformanceDeepLeafComposition.makeInit(() => ({
    model: LeafModel.make({ value: 0 }),
  })),
  update: TypePerformanceDeepLeafComposition.makeUpdate((model, message) =>
    LeafMessage.match(message, {
      RequestedRun: () => runLeaf(model),
      CompletedRun: () => ({ model }),
    }),
  ),
  expose: { runLeaf },
  EffectsLayer: RunLeaf.layer,
})

const TypePerformanceLevel001 = Block.define('TypePerformanceLevel001', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child001Binding = TypePerformanceLevel001.bindChild(Leaf, {
  placement: 'child001',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel001Composition =
  TypePerformanceLevel001.makeComposition({ childBindings: [Child001Binding] })
const Level001 = TypePerformanceLevel001Composition.makeBlock({
  init: TypePerformanceLevel001Composition.makeInit(() =>
    Child001Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel001Composition.makeUpdate((model, message) =>
    Child001Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel002 = Block.define('TypePerformanceLevel002', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child002Binding = TypePerformanceLevel002.bindChild(Level001, {
  placement: 'child002',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel002Composition =
  TypePerformanceLevel002.makeComposition({ childBindings: [Child002Binding] })
const Level002 = TypePerformanceLevel002Composition.makeBlock({
  init: TypePerformanceLevel002Composition.makeInit(() =>
    Child002Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel002Composition.makeUpdate((model, message) =>
    Child002Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel003 = Block.define('TypePerformanceLevel003', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child003Binding = TypePerformanceLevel003.bindChild(Level002, {
  placement: 'child003',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel003Composition =
  TypePerformanceLevel003.makeComposition({ childBindings: [Child003Binding] })
const Level003 = TypePerformanceLevel003Composition.makeBlock({
  init: TypePerformanceLevel003Composition.makeInit(() =>
    Child003Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel003Composition.makeUpdate((model, message) =>
    Child003Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel004 = Block.define('TypePerformanceLevel004', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child004Binding = TypePerformanceLevel004.bindChild(Level003, {
  placement: 'child004',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel004Composition =
  TypePerformanceLevel004.makeComposition({ childBindings: [Child004Binding] })
const Level004 = TypePerformanceLevel004Composition.makeBlock({
  init: TypePerformanceLevel004Composition.makeInit(() =>
    Child004Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel004Composition.makeUpdate((model, message) =>
    Child004Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel005 = Block.define('TypePerformanceLevel005', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child005Binding = TypePerformanceLevel005.bindChild(Level004, {
  placement: 'child005',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel005Composition =
  TypePerformanceLevel005.makeComposition({ childBindings: [Child005Binding] })
const Level005 = TypePerformanceLevel005Composition.makeBlock({
  init: TypePerformanceLevel005Composition.makeInit(() =>
    Child005Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel005Composition.makeUpdate((model, message) =>
    Child005Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel006 = Block.define('TypePerformanceLevel006', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child006Binding = TypePerformanceLevel006.bindChild(Level005, {
  placement: 'child006',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel006Composition =
  TypePerformanceLevel006.makeComposition({ childBindings: [Child006Binding] })
const Level006 = TypePerformanceLevel006Composition.makeBlock({
  init: TypePerformanceLevel006Composition.makeInit(() =>
    Child006Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel006Composition.makeUpdate((model, message) =>
    Child006Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel007 = Block.define('TypePerformanceLevel007', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child007Binding = TypePerformanceLevel007.bindChild(Level006, {
  placement: 'child007',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel007Composition =
  TypePerformanceLevel007.makeComposition({ childBindings: [Child007Binding] })
const Level007 = TypePerformanceLevel007Composition.makeBlock({
  init: TypePerformanceLevel007Composition.makeInit(() =>
    Child007Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel007Composition.makeUpdate((model, message) =>
    Child007Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const TypePerformanceLevel008 = Block.define('TypePerformanceLevel008', {
  Model: LeafModel,
  Message: LeafMessage,
})
const Child008Binding = TypePerformanceLevel008.bindChild(Level007, {
  placement: 'child008',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const TypePerformanceLevel008Composition =
  TypePerformanceLevel008.makeComposition({ childBindings: [Child008Binding] })
const Level008 = TypePerformanceLevel008Composition.makeBlock({
  init: TypePerformanceLevel008Composition.makeInit(() =>
    Child008Binding.init({ args: [], toParentModel: model => model }),
  ),
  update: TypePerformanceLevel008Composition.makeUpdate((model, message) =>
    Child008Binding.fold(model, message),
  ),
  EffectsLayer: Layer.empty,
})

const Application = defineApplication({
  Model: LeafModel,
  Message: LeafMessage,
})
const Child008RootBinding = Application.bindChild(Level008, {
  placement: 'child008Root',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
  toParentMessage: message => message,
  fromParentMessage: false,
})
const ApplicationComposition = Application.makeComposition({
  childBindings: [Child008RootBinding],
})
const update = ApplicationComposition.makeUpdate((model, message) =>
  Child008RootBinding.fold(model, message),
)
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

export const program = ApplicationComposition.makeElement({
  container: null,
  init: ApplicationComposition.makeInit(() =>
    Child008RootBinding.init({ args: [], toParentModel: model => model }),
  ),
  update,
  view,
  EffectsLayer: Layer.empty,
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
