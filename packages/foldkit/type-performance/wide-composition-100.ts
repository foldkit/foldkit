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
>()('TypePerformanceWideLeafClock') {}
const ClockLayer = Layer.succeed(Clock, { run: Effect.void })

const TypePerformanceWideLeafDefinition = Block.makeDefinition(
  'TypePerformanceWideLeaf',
  {
    Model: LeafModel,
    Message: LeafMessage,
  },
)
const RunLeaf = TypePerformanceWideLeafDefinition.makeCommand('RunLeaf', {
  messages: [LeafMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(LeafMessage.CompletedRun()))
  },
})
const runLeaf = TypePerformanceWideLeafDefinition.makeStep(model => ({
  model,
  commands: [RunLeaf()],
}))
const TypePerformanceWideLeafComposition =
  TypePerformanceWideLeafDefinition.makeComposition()
const prepareLeaf = () =>
  TypePerformanceWideLeafComposition.prepareBlock({
    init: TypePerformanceWideLeafComposition.makeInit(() => ({
      model: LeafModel.make({ value: 0 }),
    })),
    update: TypePerformanceWideLeafComposition.makeUpdate({
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

const ApplicationModel = Schema.Struct({ leaf: LeafModel })
type ApplicationModel = typeof ApplicationModel.Type

const ApplicationMessage = Schema.Never

const ApplicationDefinition = Block.makeDefinition('Application', {
  Model: ApplicationModel,
  Message: ApplicationMessage,
})

const Leaf001Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf001',
})

const Leaf002Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf002',
})

const Leaf003Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf003',
})

const Leaf004Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf004',
})

const Leaf005Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf005',
})

const Leaf006Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf006',
})

const Leaf007Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf007',
})

const Leaf008Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf008',
})

const Leaf009Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf009',
})

const Leaf010Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf010',
})

const Leaf011Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf011',
})

const Leaf012Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf012',
})

const Leaf013Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf013',
})

const Leaf014Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf014',
})

const Leaf015Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf015',
})

const Leaf016Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf016',
})

const Leaf017Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf017',
})

const Leaf018Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf018',
})

const Leaf019Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf019',
})

const Leaf020Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf020',
})

const Leaf021Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf021',
})

const Leaf022Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf022',
})

const Leaf023Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf023',
})

const Leaf024Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf024',
})

const Leaf025Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf025',
})

const Leaf026Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf026',
})

const Leaf027Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf027',
})

const Leaf028Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf028',
})

const Leaf029Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf029',
})

const Leaf030Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf030',
})

const Leaf031Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf031',
})

const Leaf032Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf032',
})

const Leaf033Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf033',
})

const Leaf034Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf034',
})

const Leaf035Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf035',
})

const Leaf036Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf036',
})

const Leaf037Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf037',
})

const Leaf038Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf038',
})

const Leaf039Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf039',
})

const Leaf040Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf040',
})

const Leaf041Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf041',
})

const Leaf042Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf042',
})

const Leaf043Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf043',
})

const Leaf044Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf044',
})

const Leaf045Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf045',
})

const Leaf046Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf046',
})

const Leaf047Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf047',
})

const Leaf048Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf048',
})

const Leaf049Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf049',
})

const Leaf050Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf050',
})

const Leaf051Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf051',
})

const Leaf052Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf052',
})

const Leaf053Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf053',
})

const Leaf054Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf054',
})

const Leaf055Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf055',
})

const Leaf056Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf056',
})

const Leaf057Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf057',
})

const Leaf058Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf058',
})

const Leaf059Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf059',
})

const Leaf060Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf060',
})

const Leaf061Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf061',
})

const Leaf062Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf062',
})

const Leaf063Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf063',
})

const Leaf064Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf064',
})

const Leaf065Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf065',
})

const Leaf066Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf066',
})

const Leaf067Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf067',
})

const Leaf068Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf068',
})

const Leaf069Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf069',
})

const Leaf070Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf070',
})

const Leaf071Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf071',
})

const Leaf072Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf072',
})

const Leaf073Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf073',
})

const Leaf074Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf074',
})

const Leaf075Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf075',
})

const Leaf076Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf076',
})

const Leaf077Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf077',
})

const Leaf078Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf078',
})

const Leaf079Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf079',
})

const Leaf080Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf080',
})

const Leaf081Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf081',
})

const Leaf082Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf082',
})

const Leaf083Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf083',
})

const Leaf084Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf084',
})

const Leaf085Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf085',
})

const Leaf086Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf086',
})

const Leaf087Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf087',
})

const Leaf088Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf088',
})

const Leaf089Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf089',
})

const Leaf090Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf090',
})

const Leaf091Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf091',
})

const Leaf092Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf092',
})

const Leaf093Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf093',
})

const Leaf094Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf094',
})

const Leaf095Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf095',
})

const Leaf096Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf096',
})

const Leaf097Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf097',
})

const Leaf098Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf098',
})

const Leaf099Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf099',
})

const Leaf100Binding = ApplicationDefinition.makeBinding(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf100',
})

const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [
    Leaf001Binding,
    Leaf002Binding,
    Leaf003Binding,
    Leaf004Binding,
    Leaf005Binding,
    Leaf006Binding,
    Leaf007Binding,
    Leaf008Binding,
    Leaf009Binding,
    Leaf010Binding,
    Leaf011Binding,
    Leaf012Binding,
    Leaf013Binding,
    Leaf014Binding,
    Leaf015Binding,
    Leaf016Binding,
    Leaf017Binding,
    Leaf018Binding,
    Leaf019Binding,
    Leaf020Binding,
    Leaf021Binding,
    Leaf022Binding,
    Leaf023Binding,
    Leaf024Binding,
    Leaf025Binding,
    Leaf026Binding,
    Leaf027Binding,
    Leaf028Binding,
    Leaf029Binding,
    Leaf030Binding,
    Leaf031Binding,
    Leaf032Binding,
    Leaf033Binding,
    Leaf034Binding,
    Leaf035Binding,
    Leaf036Binding,
    Leaf037Binding,
    Leaf038Binding,
    Leaf039Binding,
    Leaf040Binding,
    Leaf041Binding,
    Leaf042Binding,
    Leaf043Binding,
    Leaf044Binding,
    Leaf045Binding,
    Leaf046Binding,
    Leaf047Binding,
    Leaf048Binding,
    Leaf049Binding,
    Leaf050Binding,
    Leaf051Binding,
    Leaf052Binding,
    Leaf053Binding,
    Leaf054Binding,
    Leaf055Binding,
    Leaf056Binding,
    Leaf057Binding,
    Leaf058Binding,
    Leaf059Binding,
    Leaf060Binding,
    Leaf061Binding,
    Leaf062Binding,
    Leaf063Binding,
    Leaf064Binding,
    Leaf065Binding,
    Leaf066Binding,
    Leaf067Binding,
    Leaf068Binding,
    Leaf069Binding,
    Leaf070Binding,
    Leaf071Binding,
    Leaf072Binding,
    Leaf073Binding,
    Leaf074Binding,
    Leaf075Binding,
    Leaf076Binding,
    Leaf077Binding,
    Leaf078Binding,
    Leaf079Binding,
    Leaf080Binding,
    Leaf081Binding,
    Leaf082Binding,
    Leaf083Binding,
    Leaf084Binding,
    Leaf085Binding,
    Leaf086Binding,
    Leaf087Binding,
    Leaf088Binding,
    Leaf089Binding,
    Leaf090Binding,
    Leaf091Binding,
    Leaf092Binding,
    Leaf093Binding,
    Leaf094Binding,
    Leaf095Binding,
    Leaf096Binding,
    Leaf097Binding,
    Leaf098Binding,
    Leaf099Binding,
    Leaf100Binding,
  ],
})

const update = ApplicationComposition.makeUpdate({})
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

const prepareApplicationBlock = () =>
  ApplicationComposition.prepareBlock({
    init: ApplicationComposition.makeInit(() => ({
      model: ApplicationModel.make({ leaf: LeafModel.make({ value: 0 }) }),
    })),
    update,
    view,
    EffectsLayer: Layer.empty,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof ApplicationModel,
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
