import { Context, Data, Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

export const Model = Schema.Struct({ count: Schema.Number })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({ ClickedIncrement: {} })
export type Message = typeof Message.Type

export const CounterKey = Symbol('ConstructorPlanCounter')
export const CounterDefinition = Block.makeDefinition(
  'ConstructorPlanCounter',
  {
    key: CounterKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)

export const ForeignKey = Symbol('ConstructorPlanForeign')
export const ForeignDefinition = Block.makeDefinition(
  'ConstructorPlanForeign',
  {
    key: ForeignKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
    view: { kind: 'Element' },
  },
)

export const composition = CounterDefinition.makeComposition()
export const foreignComposition = ForeignDefinition.makeComposition()
export const cases = {
  ClickedIncrement: CounterDefinition.makeFieldsStep(() => ({
    count: count => count + 1,
  })),
}
export const init = composition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const update = composition.makeUpdate(cases)
export const view = composition.makeView((model, h) =>
  h.p([], [globalThis.String(model.count)]),
)
export const foreignUpdate = foreignComposition.makeUpdate(cases)
export const foreignView = foreignComposition.makeView((model, h) =>
  h.p([], [globalThis.String(model.count)]),
)

export const CounterBlock = CounterDefinition.makeBlock(
  Effect.succeed({ children: [], init, update, view }),
)

export const FirstMount = CounterDefinition.makeMount('First', {
  messages: [Message.ClickedIncrement],
  handler: function* () {
    return () => Effect.succeed(Message.ClickedIncrement())
  },
})
export const SecondMount = CounterDefinition.makeMount('Second', {
  messages: [Message.ClickedIncrement],
  handler: function* () {
    return () => Effect.succeed(Message.ClickedIncrement())
  },
})
export const EffectsLayer = Layer.mergeAll(FirstMount.layer, SecondMount.layer)
export const firstComposition = CounterDefinition.makeComposition({
  mounts: [FirstMount],
})
export const secondComposition = CounterDefinition.makeComposition({
  mounts: [SecondMount],
})
export const firstInit = firstComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const secondInit = secondComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
export const firstUpdate = firstComposition.makeUpdate(cases)
export const secondUpdate = secondComposition.makeUpdate(cases)
export const firstView = firstComposition.makeView((model, h) =>
  h.p([], [globalThis.String(model.count)]),
)
export const secondView = secondComposition.makeView((model, h) =>
  h.p([], [globalThis.String(model.count)]),
)

declare const isFirst: boolean

export const aligned = isFirst
  ? {
      children: [],
      init: firstInit,
      update: firstUpdate,
      view: firstView,
      EffectsLayer,
    }
  : {
      children: [],
      init: secondInit,
      update: secondUpdate,
      view: secondView,
      EffectsLayer,
    }

export const ConditionalBlock = CounterDefinition.makeBlock(
  Effect.succeed(aligned),
)

export const HeadlessKey = Symbol('ConstructorPlanHeadless')
export const HeadlessDefinition = Block.makeDefinition(
  'ConstructorPlanHeadless',
  {
    key: HeadlessKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
  },
)
export const headlessComposition = HeadlessDefinition.makeComposition()
export const HeadlessBlock = HeadlessDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: headlessComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: headlessComposition.makeUpdate(cases),
  }),
)

export const makeCounter = <Count extends number>(count: Count) =>
  CounterDefinition.makeBlock(
    Effect.succeed({
      children: [],
      init: composition.makeInit(() => ({ model: Model.make({ count }) })),
      update,
      view,
    }),
  )

export const ContextualKey = Symbol('ConstructorPlanContextual')
export const ContextualDefinition = Block.makeDefinition(
  'ConstructorPlanContextual',
  {
    key: ContextualKey,
    Model,
    Message,
    InitArgs: Schema.Tuple([]),
    Context:
      Block.makeInputContract<
        readonly [increment?: number, ...labels: ReadonlyArray<string>]
      >(),
    view: { kind: 'Element' },
  },
)
export const contextualComposition = ContextualDefinition.makeComposition()
export const contextualUpdate = contextualComposition.makeUpdate.withContext(
  (increment: number = 1, ...labels: ReadonlyArray<string>) => ({
    ClickedIncrement: ContextualDefinition.makeFieldsStep(model => ({
      count: () => model.count + increment + labels.length,
    })),
  }),
)
export const ContextualBlock = ContextualDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: contextualComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: contextualUpdate,
    view: contextualComposition.makeView((model, h) =>
      h.p([], [globalThis.String(model.count)]),
    ),
  }),
)

export class GraphSettings extends Context.Service<
  GraphSettings,
  Readonly<{ isUnavailable: boolean }>
>()('ConstructorPlanGraphSettings') {}

export class GraphBuildError extends Data.TaggedError(
  'ConstructorPlanGraphBuildError',
)<{}> {}

export const RequiredBlock = CounterDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* GraphSettings

    if (settings.isUnavailable) {
      return yield* Effect.fail(new GraphBuildError())
    }

    return { children: [], init, update, view }
  }),
)
