import { Effect, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Program from '../runtime/programPublic.js'
import type { AssemblyDraft, AssemblyDraftTypeId } from './assemblyState.js'
import { defaultViewOf } from './defaultView.js'
import { makeDefinition } from './define.js'
import type { AnyBlock } from './definition.js'
import {
  type FromAssemblyWithOutMessage,
  type FromAssemblyWithView,
  type FromAssemblyWithViewAndOutMessage,
  type FromAssemblyWithoutViewOrOutMessage,
  assemble,
} from './fromAssembly.js'

type Produced<Producer extends () => AssemblyDraft<object>> =
  ReturnType<Producer>[typeof AssemblyDraftTypeId]

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ CompletedObserve: {} })
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({
  ReportedCount: { count: Schema.Number },
})
type OutMessage = typeof OutMessage.Type
const Definition = makeDefinition('FromAssemblyRuntime', { Model, Message })
const ReportingDefinition = makeDefinition('FromAssemblyReportingRuntime', {
  Model,
  Message,
  OutMessage,
})
const constructed: Array<string> = []
const Observe = Definition.makeCommand('Observe', {
  messages: [Message.CompletedObserve],
  handler: function* () {
    constructed.push('Observe')

    return () => Effect.succeed(Message.CompletedObserve())
  },
})
const Composition = Definition.makeComposition()
const ReportingComposition = ReportingDefinition.makeComposition()
const init = Composition.makeInit(() => ({
  model: Model.make({ count: 0 }),
  commands: [Observe()],
}))
const update = Composition.makeUpdate({
  CompletedObserve: model => ({ model }),
})
const view = Composition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)
const reportingInit = ReportingComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const reportingUpdate = ReportingComposition.makeUpdate({
  CompletedObserve: model => ({
    model,
    outMessage: OutMessage.ReportedCount({ count: model.count }),
  }),
})
const reportingView = ReportingComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)

const prepareViewed = () =>
  Composition.prepareBlock({ init, update, view, EffectsLayer: Observe.layer })
const prepareHeadless = () =>
  Composition.prepareBlock({ init, update, EffectsLayer: Observe.layer })
const prepareReportingViewed = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
    view: reportingView,
  })
const prepareReportingHeadless = () =>
  ReportingComposition.prepareBlock({
    init: reportingInit,
    update: reportingUpdate,
  })

type ViewedHeader = FromAssemblyWithView<typeof Model, typeof prepareViewed>
type HeadlessHeader = FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareHeadless
>
type ReportingViewedHeader = FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepareReportingViewed
>
type ReportingHeadlessHeader = FromAssemblyWithOutMessage<
  typeof Model,
  typeof prepareReportingHeadless
>

const Viewed: ViewedHeader = assemble(prepareViewed)
const Headless: HeadlessHeader = assemble(prepareHeadless)
const ReportingViewed: ReportingViewedHeader = assemble(prepareReportingViewed)
const ReportingHeadless: ReportingHeadlessHeader = assemble(
  prepareReportingHeadless,
)

const ParentDefinition = makeDefinition('FromAssemblyParent', {
  Model: Schema.Struct({ child: Model }),
  Message: Schema.Never,
})

const HostDefinition = makeDefinition('FromAssemblyHost', { Model, Message })
const HostObserve = HostDefinition.makeCommand('HostObserve', {
  messages: [Message.CompletedObserve],
})
const HostComposition = HostDefinition.makeComposition()
const hostInit = HostComposition.makeInit(() => ({
  model: Model.make({ count: 0 }),
}))
const hostUpdate = HostComposition.makeUpdate({
  CompletedObserve: model => ({
    model,
    commands: [HostObserve()],
  }),
})
const hostView = HostComposition.makeView((model, h) =>
  h.div([], [globalThis.String(model.count)]),
)
const prepareHosted = () =>
  HostComposition.prepareBlock({
    init: hostInit,
    update: hostUpdate,
    view: hostView,
    hostHandlers: [HostObserve],
  })
const Hosted: FromAssemblyWithView<typeof Model, typeof prepareHosted> =
  assemble(prepareHosted)

describe('Checked Block completion', () => {
  it('rejects copied drafts and copied completed Blocks', () => {
    const draft = prepareViewed()
    const copiedDraft = { ...draft }
    const copiedBlock = { ...Viewed }

    expect(() =>
      Reflect.apply(assemble, undefined, [() => copiedDraft]),
    ).toThrow('original Composition.prepareBlock draft')
    expect(() =>
      ParentDefinition.makeBinding(copiedBlock, { field: 'child' }),
    ).toThrow('Block.assemble(prepare)')
    expect(() =>
      Program.makeElement({
        block: copiedBlock,
        container: document.createElement('div'),
      }),
    ).toThrow('Block.assemble(prepare)')
  })

  it('retains the exact contract for every view and OutMessage shape', () => {
    for (const block of [
      Viewed,
      Headless,
      ReportingViewed,
      ReportingHeadless,
    ]) {
      expect(block.Model).toBe(Model)
    }

    expectTypeOf<typeof Viewed.Model>().toEqualTypeOf<typeof Model>()
    expectTypeOf<typeof Headless.Model>().toEqualTypeOf<typeof Model>()
    expectTypeOf<typeof ReportingViewed.Model>().toEqualTypeOf<typeof Model>()
    expectTypeOf<typeof ReportingHeadless.Model>().toEqualTypeOf<typeof Model>()
    expectTypeOf<typeof Viewed>().toMatchTypeOf<
      Produced<typeof prepareViewed>
    >()
    expectTypeOf<Produced<typeof prepareViewed>>().toMatchTypeOf<
      typeof Viewed
    >()
    expectTypeOf<typeof Headless>().toMatchTypeOf<
      Produced<typeof prepareHeadless>
    >()
    expectTypeOf<Produced<typeof prepareHeadless>>().toMatchTypeOf<
      typeof Headless
    >()
    expectTypeOf<typeof ReportingViewed>().toMatchTypeOf<
      Produced<typeof prepareReportingViewed>
    >()
    expectTypeOf<Produced<typeof prepareReportingViewed>>().toMatchTypeOf<
      typeof ReportingViewed
    >()
    expectTypeOf<typeof ReportingHeadless>().toMatchTypeOf<
      Produced<typeof prepareReportingHeadless>
    >()
    expectTypeOf<Produced<typeof prepareReportingHeadless>>().toMatchTypeOf<
      typeof ReportingHeadless
    >()
  })

  it('keeps unfinished assemblies opaque and leaves handler recipes passive', () => {
    const draft = prepareViewed()

    expect(Object.isFrozen(draft)).toBe(true)
    expect(Reflect.ownKeys(draft)).toEqual([])
    expect(constructed).toEqual([])
  })

  it('calls the producer once and preserves the original completed object', () => {
    const draft = prepareViewed()
    const calls: Array<string> = []
    const prepare = () => {
      calls.push('assemble')
      return draft
    }
    const block: FromAssemblyWithView<typeof Model, typeof prepare> =
      assemble(prepare)
    const repeated: FromAssemblyWithView<typeof Model, typeof prepare> =
      assemble(prepare)

    expect(calls).toEqual(['assemble', 'assemble'])
    expect(block).toBe(repeated)
    expect(block.Model).toBe(Model)
    expect(block.init).toBe(init)
    expect(block.update).toBe(update)
    expect(defaultViewOf(block)).toBe(view)
    expect(Reflect.ownKeys(block)).toEqual(Reflect.ownKeys(repeated))
    expect(constructed).toEqual([])
  })

  it('preserves completion when replacing local handler recipes', () => {
    const replaced = Viewed.replaceEffectsLayer(Observe.layer)
    const binding = ParentDefinition.makeBinding(replaced, { field: 'child' })

    expect(binding.placement).toBe('child')
    expect(replaced.Model).toBe(Model)
    expect(defaultViewOf(replaced)).toBe(view)
    expect(() =>
      Program.makeElement({
        block: replaced,
        container: document.createElement('div'),
      }),
    ).not.toThrow()
    expect(constructed).toEqual([])
  })

  it('preserves completion when supplying host handlers', () => {
    const provided = Hosted.provideHandlers(
      HostObserve.toLayer(
        Effect.succeed(() => Effect.succeed(Message.CompletedObserve())),
      ),
    )
    const binding = ParentDefinition.makeBinding(provided, { field: 'child' })

    expect(binding.placement).toBe('child')
    expect(provided.hostHandlers).toEqual([])
    expect(defaultViewOf(provided)).toBe(hostView)
    expect(() =>
      Program.makeElement({
        block: provided,
        container: document.createElement('div'),
      }),
    ).not.toThrow()
    expect(constructed).toEqual([])
  })

  it('allows extensions after checked completion', () => {
    const extended = Object.assign(Viewed, { test: { drain: () => 1 } })

    expect(extended.Model).toBe(Model)
    expect(extended.test.drain()).toBe(1)
    expect(() =>
      Program.makeElement({
        block: extended,
        container: document.createElement('div'),
      }),
    ).not.toThrow()
  })

  it('rejects unfinished or forged Blocks at erased public boundaries', () => {
    const draft = prepareViewed()

    expect(() =>
      Reflect.apply(assemble, undefined, [() => ({ Model })]),
    ).toThrow('original Composition.prepareBlock draft')
    expect(() =>
      Reflect.apply(ParentDefinition.makeBinding, undefined, [
        draft,
        { field: 'child' },
      ]),
    ).toThrow('Block.assemble(prepare)')
    expect(() =>
      Reflect.apply(Program.makeElement, undefined, [
        { block: draft, container: null },
      ]),
    ).toThrow('Block.assemble(prepare)')
  })
})

declare const anyProducer: any
declare const unknownProducer: () => unknown
declare function overloadedProducer(): any
declare function overloadedProducer(): never
declare function overloadedProducer(): ReturnType<typeof prepareViewed>

if (false) {
  const draft = prepareViewed()
  // @ts-expect-error An unfinished assembly exposes no Model Schema.
  Schema.Struct({ child: draft.Model })
  // @ts-expect-error A draft cannot be widened into a completed Block.
  const rawAsBlock: AnyBlock = draft
  // @ts-expect-error The checked header requires the finishing call.
  const rawAsHeader: ViewedHeader = prepareViewed()
  // @ts-expect-error Bindings accept only completed Blocks.
  ParentDefinition.makeBinding(draft, { field: 'child' })
  // @ts-expect-error Programs accept only completed Blocks.
  Program.makeElement({ block: draft, container: null })
  // @ts-expect-error A draft cannot bypass completion through a handler transform.
  draft.replaceEffectsLayer(Observe.layer)
  // @ts-expect-error Completion requires an explicit Model header.
  assemble(prepareViewed)
  // @ts-expect-error An inline producer also requires an explicit Model header.
  assemble(() =>
    Composition.prepareBlock({
      init,
      update,
      view,
      EffectsLayer: Observe.layer,
    }),
  )
  // @ts-expect-error A headless assembly cannot acquire a view from its header.
  const inventedView: ViewedHeader = assemble(prepareHeadless)
  // @ts-expect-error An OutMessage Schema cannot disappear through completion.
  const erasedOutMessage: ViewedHeader = assemble(prepareReportingViewed)
  // @ts-expect-error A view cannot disappear through completion.
  const erasedView: ReportingHeadlessHeader = assemble(prepareReportingViewed)
  // @ts-expect-error An any producer cannot enter a valid header.
  const anyBlock: ViewedHeader = assemble(anyProducer)
  // @ts-expect-error An unknown producer cannot enter a valid header.
  const unknownBlock: ViewedHeader = assemble(unknownProducer)
  // @ts-expect-error Overload sets cannot hide an any-returning signature.
  const overloadedBlock: ViewedHeader = assemble(overloadedProducer)

  void [
    rawAsBlock,
    rawAsHeader,
    inventedView,
    erasedOutMessage,
    erasedView,
    anyBlock,
    unknownBlock,
    overloadedBlock,
  ]
}
