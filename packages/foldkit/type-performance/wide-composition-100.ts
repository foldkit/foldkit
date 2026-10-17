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
>()('TypePerformanceWideLeafClock') {}
const ClockLayer = Layer.succeed(Clock, { run: Effect.void })

const TypePerformanceWideLeaf = Block.define('TypePerformanceWideLeaf', {
  Model: LeafModel,
  Message: LeafMessage,
})
const RunLeaf = TypePerformanceWideLeaf.command('RunLeaf', {
  messages: [LeafMessage.CompletedRun],
  handler: function* () {
    const clock = yield* Clock

    return () => clock.run.pipe(Effect.as(LeafMessage.CompletedRun()))
  },
})
const runLeaf = TypePerformanceWideLeaf.step(model => ({
  model,
  commands: [RunLeaf()],
}))
const TypePerformanceWideLeafComposition =
  TypePerformanceWideLeaf.makeComposition()
const Leaf = TypePerformanceWideLeafComposition.makeBlock({
  init: TypePerformanceWideLeafComposition.makeInit(() => ({
    model: LeafModel.make({ value: 0 }),
  })),
  update: TypePerformanceWideLeafComposition.makeUpdate((model, message) =>
    LeafMessage.match(message, {
      RequestedRun: () => runLeaf(model),
      CompletedRun: () => ({ model }),
    }),
  ),
  expose: { runLeaf },
  EffectsLayer: RunLeaf.layer,
})

const ApplicationModel = Schema.Struct({ leaf: LeafModel })
type ApplicationModel = typeof ApplicationModel.Type

// oxlint-disable foldkit/got-prefix-requires-block-payload
const ApplicationMessage = defineMessageUnion({
  GotLeaf001Message: { message: Leaf.Message },
  GotLeaf002Message: { message: Leaf.Message },
  GotLeaf003Message: { message: Leaf.Message },
  GotLeaf004Message: { message: Leaf.Message },
  GotLeaf005Message: { message: Leaf.Message },
  GotLeaf006Message: { message: Leaf.Message },
  GotLeaf007Message: { message: Leaf.Message },
  GotLeaf008Message: { message: Leaf.Message },
  GotLeaf009Message: { message: Leaf.Message },
  GotLeaf010Message: { message: Leaf.Message },
  GotLeaf011Message: { message: Leaf.Message },
  GotLeaf012Message: { message: Leaf.Message },
  GotLeaf013Message: { message: Leaf.Message },
  GotLeaf014Message: { message: Leaf.Message },
  GotLeaf015Message: { message: Leaf.Message },
  GotLeaf016Message: { message: Leaf.Message },
  GotLeaf017Message: { message: Leaf.Message },
  GotLeaf018Message: { message: Leaf.Message },
  GotLeaf019Message: { message: Leaf.Message },
  GotLeaf020Message: { message: Leaf.Message },
  GotLeaf021Message: { message: Leaf.Message },
  GotLeaf022Message: { message: Leaf.Message },
  GotLeaf023Message: { message: Leaf.Message },
  GotLeaf024Message: { message: Leaf.Message },
  GotLeaf025Message: { message: Leaf.Message },
  GotLeaf026Message: { message: Leaf.Message },
  GotLeaf027Message: { message: Leaf.Message },
  GotLeaf028Message: { message: Leaf.Message },
  GotLeaf029Message: { message: Leaf.Message },
  GotLeaf030Message: { message: Leaf.Message },
  GotLeaf031Message: { message: Leaf.Message },
  GotLeaf032Message: { message: Leaf.Message },
  GotLeaf033Message: { message: Leaf.Message },
  GotLeaf034Message: { message: Leaf.Message },
  GotLeaf035Message: { message: Leaf.Message },
  GotLeaf036Message: { message: Leaf.Message },
  GotLeaf037Message: { message: Leaf.Message },
  GotLeaf038Message: { message: Leaf.Message },
  GotLeaf039Message: { message: Leaf.Message },
  GotLeaf040Message: { message: Leaf.Message },
  GotLeaf041Message: { message: Leaf.Message },
  GotLeaf042Message: { message: Leaf.Message },
  GotLeaf043Message: { message: Leaf.Message },
  GotLeaf044Message: { message: Leaf.Message },
  GotLeaf045Message: { message: Leaf.Message },
  GotLeaf046Message: { message: Leaf.Message },
  GotLeaf047Message: { message: Leaf.Message },
  GotLeaf048Message: { message: Leaf.Message },
  GotLeaf049Message: { message: Leaf.Message },
  GotLeaf050Message: { message: Leaf.Message },
  GotLeaf051Message: { message: Leaf.Message },
  GotLeaf052Message: { message: Leaf.Message },
  GotLeaf053Message: { message: Leaf.Message },
  GotLeaf054Message: { message: Leaf.Message },
  GotLeaf055Message: { message: Leaf.Message },
  GotLeaf056Message: { message: Leaf.Message },
  GotLeaf057Message: { message: Leaf.Message },
  GotLeaf058Message: { message: Leaf.Message },
  GotLeaf059Message: { message: Leaf.Message },
  GotLeaf060Message: { message: Leaf.Message },
  GotLeaf061Message: { message: Leaf.Message },
  GotLeaf062Message: { message: Leaf.Message },
  GotLeaf063Message: { message: Leaf.Message },
  GotLeaf064Message: { message: Leaf.Message },
  GotLeaf065Message: { message: Leaf.Message },
  GotLeaf066Message: { message: Leaf.Message },
  GotLeaf067Message: { message: Leaf.Message },
  GotLeaf068Message: { message: Leaf.Message },
  GotLeaf069Message: { message: Leaf.Message },
  GotLeaf070Message: { message: Leaf.Message },
  GotLeaf071Message: { message: Leaf.Message },
  GotLeaf072Message: { message: Leaf.Message },
  GotLeaf073Message: { message: Leaf.Message },
  GotLeaf074Message: { message: Leaf.Message },
  GotLeaf075Message: { message: Leaf.Message },
  GotLeaf076Message: { message: Leaf.Message },
  GotLeaf077Message: { message: Leaf.Message },
  GotLeaf078Message: { message: Leaf.Message },
  GotLeaf079Message: { message: Leaf.Message },
  GotLeaf080Message: { message: Leaf.Message },
  GotLeaf081Message: { message: Leaf.Message },
  GotLeaf082Message: { message: Leaf.Message },
  GotLeaf083Message: { message: Leaf.Message },
  GotLeaf084Message: { message: Leaf.Message },
  GotLeaf085Message: { message: Leaf.Message },
  GotLeaf086Message: { message: Leaf.Message },
  GotLeaf087Message: { message: Leaf.Message },
  GotLeaf088Message: { message: Leaf.Message },
  GotLeaf089Message: { message: Leaf.Message },
  GotLeaf090Message: { message: Leaf.Message },
  GotLeaf091Message: { message: Leaf.Message },
  GotLeaf092Message: { message: Leaf.Message },
  GotLeaf093Message: { message: Leaf.Message },
  GotLeaf094Message: { message: Leaf.Message },
  GotLeaf095Message: { message: Leaf.Message },
  GotLeaf096Message: { message: Leaf.Message },
  GotLeaf097Message: { message: Leaf.Message },
  GotLeaf098Message: { message: Leaf.Message },
  GotLeaf099Message: { message: Leaf.Message },
  GotLeaf100Message: { message: Leaf.Message },
})
// oxlint-enable foldkit/got-prefix-requires-block-payload

const Application = defineApplication({
  Model: ApplicationModel,
  Message: ApplicationMessage,
})

const Leaf001Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf001',
  parentMessage: ApplicationMessage.GotLeaf001Message,
})

const Leaf002Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf002',
  parentMessage: ApplicationMessage.GotLeaf002Message,
})

const Leaf003Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf003',
  parentMessage: ApplicationMessage.GotLeaf003Message,
})

const Leaf004Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf004',
  parentMessage: ApplicationMessage.GotLeaf004Message,
})

const Leaf005Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf005',
  parentMessage: ApplicationMessage.GotLeaf005Message,
})

const Leaf006Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf006',
  parentMessage: ApplicationMessage.GotLeaf006Message,
})

const Leaf007Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf007',
  parentMessage: ApplicationMessage.GotLeaf007Message,
})

const Leaf008Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf008',
  parentMessage: ApplicationMessage.GotLeaf008Message,
})

const Leaf009Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf009',
  parentMessage: ApplicationMessage.GotLeaf009Message,
})

const Leaf010Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf010',
  parentMessage: ApplicationMessage.GotLeaf010Message,
})

const Leaf011Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf011',
  parentMessage: ApplicationMessage.GotLeaf011Message,
})

const Leaf012Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf012',
  parentMessage: ApplicationMessage.GotLeaf012Message,
})

const Leaf013Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf013',
  parentMessage: ApplicationMessage.GotLeaf013Message,
})

const Leaf014Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf014',
  parentMessage: ApplicationMessage.GotLeaf014Message,
})

const Leaf015Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf015',
  parentMessage: ApplicationMessage.GotLeaf015Message,
})

const Leaf016Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf016',
  parentMessage: ApplicationMessage.GotLeaf016Message,
})

const Leaf017Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf017',
  parentMessage: ApplicationMessage.GotLeaf017Message,
})

const Leaf018Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf018',
  parentMessage: ApplicationMessage.GotLeaf018Message,
})

const Leaf019Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf019',
  parentMessage: ApplicationMessage.GotLeaf019Message,
})

const Leaf020Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf020',
  parentMessage: ApplicationMessage.GotLeaf020Message,
})

const Leaf021Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf021',
  parentMessage: ApplicationMessage.GotLeaf021Message,
})

const Leaf022Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf022',
  parentMessage: ApplicationMessage.GotLeaf022Message,
})

const Leaf023Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf023',
  parentMessage: ApplicationMessage.GotLeaf023Message,
})

const Leaf024Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf024',
  parentMessage: ApplicationMessage.GotLeaf024Message,
})

const Leaf025Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf025',
  parentMessage: ApplicationMessage.GotLeaf025Message,
})

const Leaf026Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf026',
  parentMessage: ApplicationMessage.GotLeaf026Message,
})

const Leaf027Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf027',
  parentMessage: ApplicationMessage.GotLeaf027Message,
})

const Leaf028Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf028',
  parentMessage: ApplicationMessage.GotLeaf028Message,
})

const Leaf029Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf029',
  parentMessage: ApplicationMessage.GotLeaf029Message,
})

const Leaf030Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf030',
  parentMessage: ApplicationMessage.GotLeaf030Message,
})

const Leaf031Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf031',
  parentMessage: ApplicationMessage.GotLeaf031Message,
})

const Leaf032Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf032',
  parentMessage: ApplicationMessage.GotLeaf032Message,
})

const Leaf033Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf033',
  parentMessage: ApplicationMessage.GotLeaf033Message,
})

const Leaf034Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf034',
  parentMessage: ApplicationMessage.GotLeaf034Message,
})

const Leaf035Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf035',
  parentMessage: ApplicationMessage.GotLeaf035Message,
})

const Leaf036Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf036',
  parentMessage: ApplicationMessage.GotLeaf036Message,
})

const Leaf037Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf037',
  parentMessage: ApplicationMessage.GotLeaf037Message,
})

const Leaf038Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf038',
  parentMessage: ApplicationMessage.GotLeaf038Message,
})

const Leaf039Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf039',
  parentMessage: ApplicationMessage.GotLeaf039Message,
})

const Leaf040Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf040',
  parentMessage: ApplicationMessage.GotLeaf040Message,
})

const Leaf041Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf041',
  parentMessage: ApplicationMessage.GotLeaf041Message,
})

const Leaf042Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf042',
  parentMessage: ApplicationMessage.GotLeaf042Message,
})

const Leaf043Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf043',
  parentMessage: ApplicationMessage.GotLeaf043Message,
})

const Leaf044Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf044',
  parentMessage: ApplicationMessage.GotLeaf044Message,
})

const Leaf045Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf045',
  parentMessage: ApplicationMessage.GotLeaf045Message,
})

const Leaf046Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf046',
  parentMessage: ApplicationMessage.GotLeaf046Message,
})

const Leaf047Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf047',
  parentMessage: ApplicationMessage.GotLeaf047Message,
})

const Leaf048Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf048',
  parentMessage: ApplicationMessage.GotLeaf048Message,
})

const Leaf049Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf049',
  parentMessage: ApplicationMessage.GotLeaf049Message,
})

const Leaf050Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf050',
  parentMessage: ApplicationMessage.GotLeaf050Message,
})

const Leaf051Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf051',
  parentMessage: ApplicationMessage.GotLeaf051Message,
})

const Leaf052Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf052',
  parentMessage: ApplicationMessage.GotLeaf052Message,
})

const Leaf053Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf053',
  parentMessage: ApplicationMessage.GotLeaf053Message,
})

const Leaf054Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf054',
  parentMessage: ApplicationMessage.GotLeaf054Message,
})

const Leaf055Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf055',
  parentMessage: ApplicationMessage.GotLeaf055Message,
})

const Leaf056Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf056',
  parentMessage: ApplicationMessage.GotLeaf056Message,
})

const Leaf057Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf057',
  parentMessage: ApplicationMessage.GotLeaf057Message,
})

const Leaf058Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf058',
  parentMessage: ApplicationMessage.GotLeaf058Message,
})

const Leaf059Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf059',
  parentMessage: ApplicationMessage.GotLeaf059Message,
})

const Leaf060Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf060',
  parentMessage: ApplicationMessage.GotLeaf060Message,
})

const Leaf061Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf061',
  parentMessage: ApplicationMessage.GotLeaf061Message,
})

const Leaf062Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf062',
  parentMessage: ApplicationMessage.GotLeaf062Message,
})

const Leaf063Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf063',
  parentMessage: ApplicationMessage.GotLeaf063Message,
})

const Leaf064Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf064',
  parentMessage: ApplicationMessage.GotLeaf064Message,
})

const Leaf065Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf065',
  parentMessage: ApplicationMessage.GotLeaf065Message,
})

const Leaf066Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf066',
  parentMessage: ApplicationMessage.GotLeaf066Message,
})

const Leaf067Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf067',
  parentMessage: ApplicationMessage.GotLeaf067Message,
})

const Leaf068Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf068',
  parentMessage: ApplicationMessage.GotLeaf068Message,
})

const Leaf069Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf069',
  parentMessage: ApplicationMessage.GotLeaf069Message,
})

const Leaf070Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf070',
  parentMessage: ApplicationMessage.GotLeaf070Message,
})

const Leaf071Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf071',
  parentMessage: ApplicationMessage.GotLeaf071Message,
})

const Leaf072Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf072',
  parentMessage: ApplicationMessage.GotLeaf072Message,
})

const Leaf073Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf073',
  parentMessage: ApplicationMessage.GotLeaf073Message,
})

const Leaf074Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf074',
  parentMessage: ApplicationMessage.GotLeaf074Message,
})

const Leaf075Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf075',
  parentMessage: ApplicationMessage.GotLeaf075Message,
})

const Leaf076Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf076',
  parentMessage: ApplicationMessage.GotLeaf076Message,
})

const Leaf077Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf077',
  parentMessage: ApplicationMessage.GotLeaf077Message,
})

const Leaf078Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf078',
  parentMessage: ApplicationMessage.GotLeaf078Message,
})

const Leaf079Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf079',
  parentMessage: ApplicationMessage.GotLeaf079Message,
})

const Leaf080Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf080',
  parentMessage: ApplicationMessage.GotLeaf080Message,
})

const Leaf081Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf081',
  parentMessage: ApplicationMessage.GotLeaf081Message,
})

const Leaf082Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf082',
  parentMessage: ApplicationMessage.GotLeaf082Message,
})

const Leaf083Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf083',
  parentMessage: ApplicationMessage.GotLeaf083Message,
})

const Leaf084Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf084',
  parentMessage: ApplicationMessage.GotLeaf084Message,
})

const Leaf085Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf085',
  parentMessage: ApplicationMessage.GotLeaf085Message,
})

const Leaf086Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf086',
  parentMessage: ApplicationMessage.GotLeaf086Message,
})

const Leaf087Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf087',
  parentMessage: ApplicationMessage.GotLeaf087Message,
})

const Leaf088Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf088',
  parentMessage: ApplicationMessage.GotLeaf088Message,
})

const Leaf089Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf089',
  parentMessage: ApplicationMessage.GotLeaf089Message,
})

const Leaf090Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf090',
  parentMessage: ApplicationMessage.GotLeaf090Message,
})

const Leaf091Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf091',
  parentMessage: ApplicationMessage.GotLeaf091Message,
})

const Leaf092Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf092',
  parentMessage: ApplicationMessage.GotLeaf092Message,
})

const Leaf093Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf093',
  parentMessage: ApplicationMessage.GotLeaf093Message,
})

const Leaf094Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf094',
  parentMessage: ApplicationMessage.GotLeaf094Message,
})

const Leaf095Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf095',
  parentMessage: ApplicationMessage.GotLeaf095Message,
})

const Leaf096Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf096',
  parentMessage: ApplicationMessage.GotLeaf096Message,
})

const Leaf097Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf097',
  parentMessage: ApplicationMessage.GotLeaf097Message,
})

const Leaf098Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf098',
  parentMessage: ApplicationMessage.GotLeaf098Message,
})

const Leaf099Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf099',
  parentMessage: ApplicationMessage.GotLeaf099Message,
})

const Leaf100Binding = Application.bindChild(Leaf, {
  field: 'leaf',
  init: false,
  placement: 'leaf100',
  parentMessage: ApplicationMessage.GotLeaf100Message,
})

const ApplicationComposition = Application.makeComposition({
  childBindings: [
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

const update = ApplicationComposition.makeUpdate()
const view = ApplicationComposition.makeView((_model, h) => h.main([]))

export const program = ApplicationComposition.makeElement({
  container: null,
  init: ApplicationComposition.makeInit(() => ({
    model: ApplicationModel.make({ leaf: LeafModel.make({ value: 0 }) }),
  })),
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
