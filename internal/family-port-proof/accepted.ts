import { Context, Effect, HashMap, Layer, Option, Result, Schema } from 'effect'
import * as AsyncData from 'foldkit/asyncData'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import { inertHtml as ih } from 'foldkit/html'
import * as Program from 'foldkit/program'
import * as Story from 'foldkit/story'

import * as Listbox from '@foldkit/ui/listbox'

type Assert<Value extends true> = Value
type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false

export class FetchSource extends Context.Service<
  FetchSource,
  Readonly<{ value: string }>
>()('UnifiedFamilyProof/FetchSource') {}
export class OtherSource extends Context.Service<
  OtherSource,
  Readonly<{ value: string }>
>()('UnifiedFamilyProof/OtherSource') {}
export class GraphSource extends Context.Service<
  GraphSource,
  Readonly<{ generation: number }>
>()('UnifiedFamilyProof/GraphSource') {}
export const GraphFailure = Schema.Struct({ reason: Schema.String })
export type GraphFailure = typeof GraphFailure.Type

export const Quotes = Query.define({
  name: 'UnifiedQuotes',
  data: Schema.String,
  error: Schema.String,
  handler: function* () {
    const source = yield* FetchSource

    return () => Effect.succeed(source.value)
  },
})
export const OtherQuotes = Quotes.provideHandlers(
  Quotes.toLayer(
    Effect.gen(function* () {
      const source = yield* OtherSource

      return () => Effect.succeed(source.value)
    }),
  ),
)
export const Windows = Query.define({
  name: 'UnifiedWindows',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  args: { label: Schema.String, offset: Schema.Number, limit: Schema.Number },
  notifyOnCompletion: true,
})
export const quotesStory = Story.withBlock(Quotes, executable =>
  executable.init(),
).pipe(Effect.provide(Query.layer))
export const windowsStory = Story.withBlock(Windows, executable =>
  executable.init(),
).pipe(Effect.provide(Query.layer))
export const completedQuote = Quotes.Message.CompletedFetch({
  generation: 1,
  result: Result.succeed('checked'),
})
export const completedWindow = Windows.Message.CompletedFetch({
  args: { label: 'devin', offset: 0, limit: 60 },
  requestKey: 'devin',
  generation: 1,
  result: Result.succeed(['devin.com']),
})

const QuotesComposition = Quotes.makeComposition()
export const initQuotes = QuotesComposition.makeInit(() => ({
  model: Quotes.Model.make({ data: AsyncData.Idle(), generation: 0 }),
}))
export const updateQuotes = QuotesComposition.makeUpdate({
  RequestedLoadIfStale: Quotes.makeCommandsStep(model => [
    Quotes.Fetch({ generation: model.generation + 1 }),
  ]),
  CompletedFetch: Quotes.makeNoopStep(),
  CompletedCancelFetch: Quotes.makeNoopStep(),
})
export const receiveQuotes = QuotesComposition.makeInMessageUpdate({
  RequestedReset: Quotes.makeNoopStep(),
  RequestedRevalidation: Quotes.makeNoopStep(),
  RequestedRevalidationOrLoad: Quotes.makeNoopStep(),
  RequestedLoadIfMissing: Quotes.makeNoopStep(),
  RequestedCancel: Quotes.makeNoopStep(),
})
export const QuotesLayer = Quotes.makeLayer(
  Effect.gen(function* () {
    yield* GraphSource

    return {
      children: [],
      init: initQuotes,
      update: updateQuotes,
      inMessageUpdate: receiveQuotes,
      EffectsLayer: Layer.empty,
      hostHandlers: [Quotes.Fetch],
    }
  }),
)
export const failingQuotesLayer = Quotes.makeLayer(
  Effect.gen(function* () {
    yield* Effect.fail(GraphFailure.make({ reason: 'unavailable' }))

    return {
      children: [],
      init: initQuotes,
      update: updateQuotes,
      inMessageUpdate: receiveQuotes,
      EffectsLayer: Layer.empty,
      hostHandlers: [Quotes.Fetch],
    }
  }),
)
export const selectedQuotesStory = Story.withBlock(
  { block: Quotes, layer: QuotesLayer },
  executable => executable.init(),
).pipe(Effect.provide(Query.layer))
export const failingQuotesStory = Story.withBlock(
  { block: Quotes, layer: failingQuotesLayer },
  executable => executable.init(),
).pipe(Effect.provide(Query.layer))

export const Apple = Listbox.makeBlock<'Apple'>()
export const Pear = Listbox.makeBlock<'Pear'>()
export const MultiApple = Listbox.Multi.makeBlock<'Apple'>()
export const MultiPear = Listbox.Multi.makeBlock<'Pear'>()
const ParentKey = Symbol('UnifiedFamilyProofParent')
export const Parent = Block.make('UnifiedFamilyProofParent', {
  key: ParentKey,
  Model: Schema.Struct({
    quotes: Quotes.Model,
    choice: Apple.Model,
    choices: MultiApple.Model,
  }),
  Message: Schema.Never,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [FetchSource] },
})
export const QuotesBinding = Parent.makeBinding(Quotes, {
  field: 'quotes',
  init: { contextToArgs: () => [] },
})
export const ChoiceBinding = Parent.makeBinding(Apple, {
  field: 'choice',
  init: { contextToArgs: () => [{ id: 'choice' }] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(Apple, {
    Selected: () => Parent.makeNoopStep(),
  }),
})
export const ChoicesBinding = Parent.makeBinding(MultiApple, {
  field: 'choices',
  init: { contextToArgs: () => [{ id: 'choices' }] },
}).withOutMessagePolicy({
  fold: Parent.makeOutMessageFold(MultiApple, {
    Selected: () => Parent.makeNoopStep(),
  }),
})
export const readChildren = Effect.gen(function* () {
  yield* QuotesBinding
  yield* ChoiceBinding
  yield* ChoicesBinding
}).pipe(
  Effect.provide(
    Layer.mergeAll(Query.layer, Listbox.layer, Listbox.Multi.layer),
  ),
)
export const ParentComposition = Parent.makeComposition({
  bindings: [QuotesBinding, ChoiceBinding, ChoicesBinding],
})
export const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
export const parentUpdate = ParentComposition.makeUpdate({})
export const parentView = ParentComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        ChoiceBinding.embedView({
          slotId: 'choice',
          model: model.choice,
          viewInputs: {
            items: ['Apple'],
            itemToConfig: () => ({ content: ih.span([], ['Apple']) }),
            buttonContent: ih.span([], ['Choose']),
            maybeSelectedValue: Option.none(),
          },
        }),
      ),
    ],
  ),
)
export const ParentLayer = Parent.makeLayer(
  Effect.gen(function* () {
    const quotes = yield* QuotesBinding
    const choice = yield* ChoiceBinding
    const choices = yield* ChoicesBinding

    return {
      children: [quotes, choice, choices],
      init: parentInit,
      update: parentUpdate,
      view: parentView,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(Query.layer, Listbox.layer, Listbox.Multi.layer),
  ),
)
export const parentStory = Story.withBlock(
  { block: Parent, layer: ParentLayer },
  executable => executable.init(),
)
export const fixedStory = Story.withBlock(Apple, executable =>
  executable.init({ id: 'fixed' }),
).pipe(Effect.provide(Listbox.layer))
export const fixedMultiStory = Story.withBlock(MultiApple, executable =>
  executable.init({ id: 'fixed-multi' }),
).pipe(Effect.provide(Listbox.Multi.layer))

export type Checks = readonly [
  Assert<Equal<'get' extends keyof typeof Quotes ? true : false, false>>,
  Assert<Equal<'contract' extends keyof typeof Quotes ? true : false, false>>,
  Assert<Equal<'makeBlock' extends keyof typeof Windows ? true : false, false>>,
  Assert<Equal<'get' extends keyof typeof Apple ? true : false, false>>,
  Assert<Equal<'makeLayer' extends keyof typeof Apple ? true : false, false>>,
  Assert<
    Equal<
      'provideHandlers' extends keyof typeof MultiApple ? true : false,
      false
    >
  >,
  Assert<Equal<Effect.Services<typeof quotesStory>, never>>,
  Assert<Equal<Effect.Services<typeof windowsStory>, never>>,
  Assert<Equal<Effect.Services<typeof selectedQuotesStory>, GraphSource>>,
  Assert<Equal<Effect.Error<typeof failingQuotesStory>, GraphFailure>>,
  Assert<Equal<Effect.Services<typeof fixedStory>, never>>,
  Assert<Equal<Effect.Services<typeof fixedMultiStory>, never>>,
  Assert<Equal<Effect.Services<typeof readChildren>, never>>,
  Assert<Equal<Effect.Services<typeof parentStory>, never>>,
  Assert<Equal<Layer.Services<typeof Quotes.EffectsLayer>, FetchSource>>,
  Assert<
    Equal<
      Block.FactsOf<typeof OtherQuotes>['effectsLayerRequirements'],
      OtherSource
    >
  >,
]
if (false) {
  Program.makeElement({ block: Parent, layer: ParentLayer, container: null })
}

export const OtherQuotesLayer = OtherQuotes.makeLayer(
  Effect.succeed({
    children: [],
    init: initQuotes,
    update: updateQuotes,
    inMessageUpdate: receiveQuotes,
    EffectsLayer: Layer.empty,
    hostHandlers: [Quotes.Fetch],
  }),
)
export const mergedQuotes = Layer.mergeAll(QuotesLayer, OtherQuotesLayer)
export const selectedAHandlers = Story.withBlock(
  { block: Quotes, layer: mergedQuotes },
  executable => Layer.build(executable.EffectsLayer),
).pipe(Effect.provide(Query.layer))
export const selectedBHandlers = Story.withBlock(
  { block: OtherQuotes, layer: mergedQuotes },
  executable => Layer.build(executable.EffectsLayer),
).pipe(Effect.provide(Query.layer))
export const providedFixedLayer = Listbox.layer.pipe(
  Layer.provide(Layer.succeed(GraphSource, { generation: 1 })),
)
export const mergedFixedLayer = Layer.mergeAll(
  Listbox.layer,
  Layer.succeed(GraphSource, { generation: 1 }),
)
export const selectedFixed = Story.withBlock(
  { block: Apple, layer: providedFixedLayer },
  executable => executable.init({ id: 'provided' }),
)
export const selectedMergedFixed = Story.withBlock(
  { block: Apple, layer: mergedFixedLayer },
  executable => executable.init({ id: 'merged' }),
)
export const selectedFixedMulti = Story.withBlock(
  { block: MultiApple, layer: Listbox.Multi.layer },
  executable => executable.init({ id: 'provided-multi' }),
)
export const bindGeneric = <Item, Value extends string>(
  child: Listbox.Completed<Item, Value>,
) =>
  Parent.makeBinding(child, {
    read: model => Option.some(model.choice),
    write: (model, nextChild) => ({ ...model, choice: nextChild }),
  })
export const readGeneric = <Item, Value extends string>(
  child: Listbox.Completed<Item, Value>,
) =>
  Effect.gen(function* () {
    return yield* bindGeneric(child)
  }).pipe(Effect.provide(Listbox.layer))
export const refinedView = Apple.makeComposition().makeView.withInputs(
  (model, inputs, h) =>
    h.div(
      [],
      [model.id, Option.getOrElse(inputs.maybeSelectedValue, () => 'Apple')],
    ),
)
export const refinedMultiView =
  MultiApple.makeComposition().makeView.withInputs((model, inputs, h) =>
    h.div([], [model.id, inputs.selectedValues.join(',')]),
  )
export const inheritedBroadStringMessage = Apple.Message.RequestedSelectItem({
  item: 'Pear',
})
export type MoreChecks = readonly [
  Assert<
    Equal<Effect.Services<typeof selectedAHandlers>, GraphSource | FetchSource>
  >,
  Assert<
    Equal<Effect.Services<typeof selectedBHandlers>, GraphSource | OtherSource>
  >,
  Assert<Equal<Effect.Services<typeof selectedFixed>, never>>,
  Assert<Equal<Effect.Services<typeof selectedMergedFixed>, never>>,
  Assert<Equal<Effect.Services<typeof selectedFixedMulti>, never>>,
  Assert<Equal<Effect.Services<ReturnType<typeof readGeneric>>, never>>,
  Assert<
    Equal<
      Block.FactsOf<typeof Apple>['operations']['requestSelectItem']['args'],
      readonly [item: 'Apple']
    >
  >,
]

export class WindowSource extends Context.Service<
  WindowSource,
  Readonly<{ suffix: string }>
>()('UnifiedFamilyProof/WindowSource') {}
export const SelectedWindows = Windows.provideHandlers(
  Windows.toLayer(
    Effect.gen(function* () {
      const source = yield* WindowSource

      return ({ label, offset, limit }) =>
        Effect.succeed([`${label}${offset}${limit}${source.suffix}`])
    }),
  ),
)
const WindowsComposition = SelectedWindows.makeComposition()
export const initWindows = WindowsComposition.makeInit(() => ({
  model: Windows.Model.make({ generation: 0, entries: HashMap.empty() }),
}))
export const updateWindows = WindowsComposition.makeUpdate({
  RequestedRevalidation: SelectedWindows.makeNoopStep(),
  RequestedRevalidationOrLoad: SelectedWindows.makeNoopStep(),
  RequestedLoadIfMissing: SelectedWindows.makeCommandsStep.fromMessage(
    ({ args }) => [
      Windows.Fetch({ args, generation: 1, requestKey: JSON.stringify(args) }),
    ],
  ),
  RequestedLoadIfStale: SelectedWindows.makeNoopStep(),
  RequestedCancel: SelectedWindows.makeNoopStep(),
  CompletedCancelFetch: SelectedWindows.makeNoopStep(),
  CompletedFetch: SelectedWindows.makeNoopStep(),
})
export const receiveWindows = WindowsComposition.makeInMessageUpdate({
  RequestedReset: SelectedWindows.makeNoopStep(),
})
export const WindowsLayer = SelectedWindows.makeLayer(
  Effect.gen(function* () {
    const source = yield* GraphSource

    if (source.generation < 0) {
      return yield* Effect.fail(
        GraphFailure.make({ reason: 'negative generation' }),
      )
    }

    return {
      children: [],
      init: initWindows,
      update: updateWindows,
      inMessageUpdate: receiveWindows,
      EffectsLayer: Layer.empty,
      hostHandlers: [Windows.Fetch],
    }
  }),
)
export const selectedWindowsStory = Story.withBlock(
  { block: SelectedWindows, layer: WindowsLayer },
  executable => executable.init(),
).pipe(Effect.provide(Query.layer))
export type KeyedChecks = readonly [
  Assert<Equal<Effect.Services<typeof selectedWindowsStory>, GraphSource>>,
  Assert<Equal<Effect.Error<typeof selectedWindowsStory>, GraphFailure>>,
  Assert<
    Equal<
      Block.FactsOf<typeof SelectedWindows>['effectsLayerRequirements'],
      WindowSource
    >
  >,
]
