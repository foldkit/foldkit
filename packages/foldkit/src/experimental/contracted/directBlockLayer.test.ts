import { Context, Effect, Layer, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { __htmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import type * as Mount from '../../mount/index.js'
import { UrlRequest } from '../../navigation/urlRequest.js'
import * as Program from '../../runtime/programPublic.js'
import { resolveProgramRoot } from '../../runtime/rootBlock.js'
import type {
  DeclaredRootBlock,
  SelectedLayerFacts,
} from '../../runtime/rootBlock.js'
import { embed } from '../../runtime/start.js'
import * as Story from '../../story/public.js'
import { modifyFields } from '../../struct/index.js'
import { Url } from '../../url/index.js'
import type { DeclaredBlockReaderTypeId } from '../constructed/contract.js'
import * as Scene from '../layered/testing/scene.js'
import { withBlock } from '../layered/testing/withBlock.js'
import * as Server from '../server/public.js'
import type { ImplementationFacts } from './contract.js'
import { selectLayer } from './runtime.js'

const ChildKey = Symbol('DirectBlockLayerChild')
const ChildModel = Schema.Struct({ value: Schema.Number })
const ChildMessage = Schema.Never
const Child = Block.make('DirectBlockLayerChild', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const ChildComposition = Child.makeComposition()
const childInit = ChildComposition.makeInit(() => ({ model: { value: 7 } }))
const childUpdate = ChildComposition.makeUpdate({})
const childLayer = Child.makeLayer(
  Effect.succeed({ children: [], init: childInit, update: childUpdate }),
)

const ParentKey = Symbol('DirectBlockLayerParent')
const ParentModel = Schema.Struct({ child: ChildModel })
const ParentMessage = Schema.Never
const Parent = Block.make('DirectBlockLayerParent', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ChildBinding = Parent.makeRequiredFieldBinding(Child, { field: 'child' })
const ParentComposition = Parent.makeComposition({ bindings: [ChildBinding] })
const parentInit = ParentComposition.makeInit(() => ({ model: {} }))
const parentUpdate = ParentComposition.makeUpdate({})
let parentViewRuns = 0
const parentView = ParentComposition.makeView((model, h) => {
  parentViewRuns += 1

  return h.div([], [`Child value: ${model.child.value}`])
})
let parentConstructorRuns = 0
class ParentService extends Context.Service<
  ParentService,
  Readonly<{ value: string }>
>()('DirectBlockLayerParent/ParentService') {}

const parentLayer = Parent.makeLayer(
  Effect.gen(function* () {
    yield* ParentService
    yield* Effect.sync(() => {
      parentConstructorRuns += 1
    })

    const child = yield* ChildBinding

    return {
      children: [child],
      init: parentInit,
      update: parentUpdate,
      view: parentView,
    }
  }),
)
const selectedParentLayer = Layer.provide(parentLayer, childLayer)
expectTypeOf<
  Layer.Services<typeof selectedParentLayer>
>().toEqualTypeOf<ParentService>()
const alternativeChildInit = ChildComposition.makeInit(() => ({
  model: { value: 9 },
}))
const alternativeChildLayer = Child.makeLayer(
  Effect.succeed({
    children: [],
    init: alternativeChildInit,
    update: childUpdate,
  }),
)
const selectedParentLayerWithAlternativeChild = Layer.provide(
  parentLayer,
  alternativeChildLayer,
)
const ForeignChildKey = Symbol('DirectBlockLayerForeignChild')
const ForeignChild = Block.make('DirectBlockLayerForeignChild', {
  key: ForeignChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
})
const ForeignChildComposition = ForeignChild.makeComposition()
const foreignChildLayer = ForeignChild.makeLayer(
  Effect.succeed({
    children: [],
    init: ForeignChildComposition.makeInit(() => ({ model: { value: 9 } })),
    update: ForeignChildComposition.makeUpdate({}),
  }),
)
const DocumentChildModel = Schema.Struct({ title: Schema.String })
const DocumentChildKey = Symbol('DirectBlockLayerDocumentChild')
const DocumentChild = Block.make('DirectBlockLayerDocumentChild', {
  key: DocumentChildKey,
  Model: DocumentChildModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const ParentWithDocumentKey = Symbol('DirectBlockLayerParentWithDocument')
const ParentWithDocument = Block.make('DirectBlockLayerParentWithDocument', {
  key: ParentWithDocumentKey,
  Model: Schema.Struct({ document: DocumentChildModel }),
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const DocumentStateBinding = ParentWithDocument.makeRequiredFieldBinding(
  DocumentChild,
  {
    field: 'document',
  },
)
const ParentWithDocumentComposition = ParentWithDocument.makeComposition({
  bindings: [DocumentStateBinding],
})
ParentWithDocumentComposition.makeView((model, h) => ({
  title: model.document.title,
  body: h.div([], [model.document.title]),
}))
const documentComposition = DocumentChild.makeComposition()
const documentChildLayer = DocumentChild.makeLayer(
  Effect.succeed({
    children: [],
    init: documentComposition.makeInit(() => ({
      model: { title: 'Preview' },
    })),
    update: documentComposition.makeUpdate({}),
    view: documentComposition.makeView((model, h) => ({
      title: model.title,
      body: h.div([], [model.title]),
    })),
  }),
)

const PageKey = Symbol('DirectBlockLayerPage')
const PageFlags = Schema.Struct({ language: Schema.String })
const PageMessage = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
})
const PageBlock = Block.make('DirectBlockLayerPage', {
  key: PageKey,
  Model: Schema.Struct({ url: Url, language: Schema.String }),
  Message: PageMessage,
  InitArgs: Schema.Tuple([PageFlags, Url]),
  view: { kind: 'Document' },
})
const PageComposition = PageBlock.makeComposition()
const pageInit = PageComposition.makeInit((flags, url) => ({
  model: { url, language: flags.language },
}))
const pageUpdate = PageComposition.makeUpdate({
  ClickedLink: model => ({ model }),
  ChangedUrl: (model, { url }) => ({
    model: modifyFields(model, { url: () => url }),
  }),
})
const pageView = PageComposition.makeView((model, h) => ({
  title: model.url.pathname,
  body: h.div([], [`${model.language}:${model.url.pathname}`]),
}))
const pageLayer = PageBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: pageInit,
    update: pageUpdate,
    view: pageView,
  }),
)

const HandlerKey = Symbol('DirectBlockLayerHandlers')
const HandlerModel = Schema.Struct({ value: Schema.String })
const HandlerMessage = defineMessageUnion({ CompletedRead: {} })
const HandlerBlock = Block.make('DirectBlockLayerHandlers', {
  key: HandlerKey,
  Model: HandlerModel,
  Message: HandlerMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Read = HandlerBlock.makeCommand('Read', {
  messages: [HandlerMessage.CompletedRead],
})
const handlerComposition = HandlerBlock.makeComposition()
const handlerInit = handlerComposition.makeInit(() => ({
  model: { value: '' },
  commands: [Read()],
}))
const handlerUpdate = handlerComposition.makeUpdate({
  CompletedRead: (_model, _message) => ({ model: { value: 'ready' } }),
})
const handlerView = handlerComposition.makeView((model, h) =>
  h.div([], [model.value]),
)
const handlerEvents: Array<string> = []
class HandlerGraphService extends Context.Service<
  HandlerGraphService,
  Readonly<{ value: string }>
>()('DirectBlockLayerHandlers/GraphService') {}
const handlerImplementation = HandlerBlock.makeLayer(
  Effect.gen(function* () {
    yield* HandlerGraphService
    yield* Effect.acquireRelease(
      Effect.sync(() => handlerEvents.push('graph acquired')),
      () => Effect.sync(() => handlerEvents.push('graph released')),
    )

    return {
      children: [],
      init: handlerInit,
      update: handlerUpdate,
      view: handlerView,
      hostHandlers: [Read],
    }
  }),
)
const selectedHandlers = Read.toLayer(
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => handlerEvents.push('handler acquired')),
      () => Effect.sync(() => handlerEvents.push('handler released')),
    )

    return () => Effect.succeed(HandlerMessage.CompletedRead())
  }),
)
const selectedHandlerImplementation = HandlerBlock.provideHandlers(
  selectedHandlers,
)(handlerImplementation)
const handlerGraphLayer = Layer.succeed(HandlerGraphService, { value: 'graph' })
const handlerSelectionBeforeDependencies = Layer.provide(
  selectedHandlerImplementation,
  handlerGraphLayer,
)
const handlerSelectionAfterDependencies = HandlerBlock.provideHandlers(
  selectedHandlers,
)(Layer.provide(handlerImplementation, handlerGraphLayer))

if (false) {
  const parentDeclaredRoot: DeclaredRootBlock = Parent
  void parentDeclaredRoot

  const missingChildLayer = Layer.provide(parentLayer, Layer.empty)
  const incompleteProgram = Program.makeElement({
    block: Parent,
    layer: missingChildLayer,
    container: null,
  })
  // @ts-expect-error The selected root Layer still needs the child binding.
  embed(incompleteProgram)

  // @ts-expect-error A foreign Block's Layer cannot implement Parent.
  Program.makeElement({
    block: Parent,
    layer: foreignChildLayer,
    container: null,
  })

  const alternativeProgram = Program.makeElement({
    block: Parent,
    layer: selectedParentLayerWithAlternativeChild,
    container: null,
  })
  expectTypeOf(alternativeProgram).not.toBeAny()

  const pageProgram = Program.make({
    block: PageBlock,
    layer: pageLayer,
    container: document.createElement('div'),
    Flags: PageFlags,
    routing: {
      onUrlRequest: PageMessage.ClickedLink,
      onUrlChange: PageMessage.ChangedUrl,
    },
  })
  expectTypeOf(pageProgram).not.toBeAny()

  // @ts-expect-error Page roots require a Document view.
  Program.make({ block: Parent, layer: parentLayer, container: null })

  const invalidPageConfiguration = {
    block: PageBlock,
    layer: pageLayer,
    container: document.createElement('div'),
    Flags: PageFlags,
    routing: {
      onUrlRequest: PageMessage.ChangedUrl,
      onUrlChange: PageMessage.ClickedLink,
    },
  }

  // @ts-expect-error Routing constructors must belong to the selected Message Schema.
  Program.make(invalidPageConfiguration)

  const documentProgram = Program.make({
    block: DocumentChild,
    layer: documentChildLayer,
    container: document.createElement('div'),
  })
  expectTypeOf(documentProgram).not.toBeAny()

  // @ts-expect-error A host provider must implement the original Read command.
  HandlerBlock.provideHandlers(Layer.empty)(handlerImplementation)

  ParentWithDocumentComposition.makeView((model, h) => ({
    title: model.document.title,
    body: h.block(
      // @ts-expect-error Document Bindings can supply state but cannot embed a Block view.
      DocumentStateBinding.embedView({
        slotId: 'document-child',
        model: model.document,
      }),
    ),
  }))
}

// @ts-expect-error Block.make returns the completed authoring value directly.
void Parent.makeBlock
// @ts-expect-error The public Block value does not expose the contract stage.
void Parent.contract

type LayerFacts<LayerValue extends Layer.Any> =
  Extract<
    Layer.Success<LayerValue>,
    ImplementationFacts<any, any, any>
  > extends ImplementationFacts<any, infer Facts, any>
    ? Facts
    : never

type DeclaredGraph<BlockValue> =
  BlockValue extends Readonly<{
    [DeclaredBlockReaderTypeId]: Effect.Effect<any, any, infer Requirements>
  }>
    ? Requirements
    : never

type Assert<Condition extends true> = Condition

type ParentLayerRetainsDeclaredGraph = Assert<
  DeclaredGraph<typeof Parent> extends Layer.Success<typeof parentLayer>
    ? true
    : false
>
type SelectedHandlerLayerRetainsDeclaredGraph = Assert<
  DeclaredGraph<typeof HandlerBlock> extends Layer.Success<
    typeof handlerSelectionBeforeDependencies
  >
    ? true
    : false
>

expectTypeOf<ParentLayerRetainsDeclaredGraph>().toEqualTypeOf<true>()
expectTypeOf<SelectedHandlerLayerRetainsDeclaredGraph>().toEqualTypeOf<true>()
expectTypeOf<LayerFacts<typeof parentLayer>>().not.toEqualTypeOf<never>()
expectTypeOf<
  Layer.Success<typeof selectedHandlerImplementation>
>().not.toBeAny()
const mergedParentAndForeignLayer = Layer.mergeAll(
  selectedParentLayer,
  foreignChildLayer,
)
expectTypeOf<
  SelectedLayerFacts<typeof mergedParentAndForeignLayer, typeof Parent.owner>
>().toEqualTypeOf<
  SelectedLayerFacts<typeof selectedParentLayer, typeof Parent.owner>
>()
expectTypeOf<
  SelectedLayerFacts<
    typeof mergedParentAndForeignLayer,
    typeof ForeignChild.owner
  >
>().toEqualTypeOf<
  SelectedLayerFacts<typeof foreignChildLayer, typeof ForeignChild.owner>
>()
expectTypeOf<
  SelectedLayerFacts<typeof parentLayer, typeof ForeignChild.owner>
>().toBeNever()

const LifecycleMessage = defineMessageUnion({ CompletedPulse: {} })
const LifecycleKey = Symbol('DirectBlockLayerLifecycle')
const LifecycleBlock = Block.make('DirectBlockLayerLifecycle', {
  key: LifecycleKey,
  Model: Schema.Struct({ value: Schema.Number }),
  Message: LifecycleMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const Pulse = LifecycleBlock.makeMount('Pulse', {
  args: { label: Schema.String },
  messages: [LifecycleMessage.CompletedPulse],
  handler: function* () {
    return () => Effect.succeed(LifecycleMessage.CompletedPulse())
  },
})
const LifecycleComposition = LifecycleBlock.makeComposition({ mounts: [Pulse] })
const lifecycleInit = LifecycleComposition.makeInit(() => ({
  model: { value: 1 },
}))
const lifecycleUpdate = LifecycleComposition.makeUpdate({
  CompletedPulse: model => ({ model }),
})
const lifecycleSubscriptions = LifecycleBlock.makeSubscriptions(entry => ({
  pulse: entry(
    'PulseSubscription',
    { value: Schema.Number },
    {
      messages: [LifecycleMessage.CompletedPulse],
      modelToDependencies: model => ({ value: model.value }),
      handler: function* () {
        return () => Stream.empty
      },
    },
  ),
}))
const lifecycleView = LifecycleComposition.makeView((model, h) =>
  h.div([h.OnMount(Pulse({ label: globalThis.String(model.value) }))]),
)
const lifecycleLayer = LifecycleBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: lifecycleInit,
    update: lifecycleUpdate,
    view: lifecycleView,
    subscriptions: lifecycleSubscriptions,
    EffectsLayer: Layer.mergeAll(Pulse.layer, lifecycleSubscriptions.layer),
  }),
)

expectTypeOf<
  LayerFacts<typeof lifecycleLayer>['mountRequirements']
>().toEqualTypeOf<Mount.RequirementsOf<typeof Pulse>>()
type OwnerOfLayer<LayerValue extends Layer.Any> =
  Extract<
    Layer.Success<LayerValue>,
    ImplementationFacts<any, any, any>
  > extends ImplementationFacts<infer OwnerValue, any, any>
    ? OwnerValue
    : never
expectTypeOf<OwnerOfLayer<typeof lifecycleLayer>>().toEqualTypeOf<
  typeof LifecycleBlock.owner
>()
expectTypeOf<
  SelectedLayerFacts<
    typeof lifecycleLayer,
    typeof LifecycleBlock.owner
  >['subscriptions']
>().toEqualTypeOf<LayerFacts<typeof lifecycleLayer>['subscriptions']>()

const DocumentModel = Schema.Struct({ title: Schema.String })
const DocumentKey = Symbol('DirectBlockLayerServerDocument')
const DocumentBlock = Block.make('DirectBlockLayerServerDocument', {
  key: DocumentKey,
  Model: DocumentModel,
  Message: Schema.Never,
  isMessageFree: true,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})
const DocumentComposition = DocumentBlock.makeComposition()
const documentLayer = DocumentBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: DocumentComposition.makeInit(() => ({ model: { title: 'Preview' } })),
    update: DocumentComposition.makeUpdate({}),
    view: DocumentComposition.makeView(model => ({
      title: model.title,
      body: __htmlBuilder<never>().main([], [model.title]),
    })),
  }),
)

describe('unified Block.make and makeLayer prototype', () => {
  it('hosts a selected page with Flags and dispatches URL changes through its update', async () => {
    const originalUrl = window.location.href
    const originalTitle = document.title
    const container = document.createElement('div')
    container.id = 'direct-block-layer-page-root'
    const wrapper = document.createElement('section')
    wrapper.append(container)
    document.body.append(wrapper)
    window.history.replaceState({}, '', '/direct-layer/first')

    const program = Program.make({
      block: PageBlock,
      layer: pageLayer,
      container,
      Flags: PageFlags,
      routing: {
        onUrlRequest: PageMessage.ClickedLink,
        onUrlChange: PageMessage.ChangedUrl,
      },
    })
    const handle = embed(program, {
      flags: Effect.succeed({ language: 'en' }),
    })

    try {
      await vi.waitFor(() => {
        expect(wrapper.textContent).toBe('en:/direct-layer/first')
        expect(document.title).toBe('/direct-layer/first')
      })

      window.history.replaceState({}, '', '/direct-layer/second')
      window.dispatchEvent(new PopStateEvent('popstate'))

      await vi.waitFor(() => {
        expect(wrapper.textContent).toBe('en:/direct-layer/second')
        expect(document.title).toBe('/direct-layer/second')
      })
    } finally {
      await handle.dispose()
      window.history.replaceState({}, '', originalUrl)
      document.title = originalTitle
      wrapper.remove()
    }
  })

  it('renders a selected routing page using request Flags and URL on Server', async () => {
    const rendered = await Effect.runPromise(
      Server.renderToString(
        { block: PageBlock, layer: pageLayer },
        { Flags: PageFlags, routing: {} },
        {
          isHydratable: false,
          flags: { language: 'fr' },
          url: 'https://workspace.example/direct-layer/server',
        },
      ),
    )

    expect(rendered.title).toBe('/direct-layer/server')
    expect(rendered.html).toContain('<div>fr:/direct-layer/server</div>')
  })

  it('selects original host handlers after graph acquisition without building their Layer', async () => {
    handlerEvents.length = 0

    const selectedRoot = selectLayer(
      HandlerBlock,
      handlerSelectionBeforeDependencies,
    )
    const implementation = await Effect.runPromise(
      Effect.scoped(resolveProgramRoot(selectedRoot)),
    )

    expect(handlerEvents).toEqual(['graph acquired', 'graph released'])
    expect(implementation.hostHandlers).toEqual([])
  })

  it('selects original handlers whether dependencies are provided before or after selection', async () => {
    for (const layer of [
      handlerSelectionBeforeDependencies,
      handlerSelectionAfterDependencies,
    ]) {
      const implementation = await Effect.runPromise(
        Effect.scoped(resolveProgramRoot(selectLayer(HandlerBlock, layer))),
      )

      expect(implementation.hostHandlers).toEqual([])
    }
  })

  it('rejects an unselected implementation that declares host handlers', async () => {
    handlerEvents.length = 0

    await expect(
      Effect.runPromise(
        Effect.scoped(
          Layer.build(Layer.provide(handlerImplementation, handlerGraphLayer)),
        ),
      ),
    ).rejects.toThrow('must resolve its original host handlers')

    expect(handlerEvents).toEqual(['graph acquired', 'graph released'])
  })

  it('rejects a foreign implementation Layer for a registered child Binding', async () => {
    const wrongProviderLayer = Layer.provide(
      Layer.provide(parentLayer, foreignChildLayer),
      Layer.succeed(ParentService, { value: 'parent' }),
    )

    await expect(
      Effect.runPromise(
        Effect.scoped(
          resolveProgramRoot(selectLayer(Parent, wrongProviderLayer)),
        ),
      ),
    ).rejects.toThrow()
  })

  it('hosts the selected handler recipe in Program without building it at selection', async () => {
    handlerEvents.length = 0
    const container = document.createElement('div')
    container.id = 'direct-block-layer-host-handler-root'
    const wrapper = document.createElement('section')
    wrapper.append(container)
    document.body.append(wrapper)
    const program = Program.makeElement({
      block: HandlerBlock,
      layer: handlerSelectionBeforeDependencies,
      container,
    })

    expect(handlerEvents).toEqual([])
    const handle = embed(program)

    try {
      await vi.waitFor(() => {
        expect(wrapper.textContent).toBe('ready')
      })
      expect(handlerEvents).toContain('handler acquired')
    } finally {
      await handle.dispose()
    }

    expect(handlerEvents).toContain('handler released')
  })

  it('hosts the explicit public Block and selected Layer pair through Program', async () => {
    parentConstructorRuns = 0
    const container = document.createElement('div')
    container.id = 'direct-block-layer-root'
    const wrapper = document.createElement('section')
    wrapper.append(container)
    document.body.append(wrapper)
    const pendingProgram = Program.makeElement({
      block: Parent,
      layer: selectedParentLayer,
      container,
    })
    type ProgramConstruction = NonNullable<
      (typeof pendingProgram)['~foldkit/ProgramConstruction']
    >
    expectTypeOf<
      Parameters<ProgramConstruction['construction']>[0]
    >().toEqualTypeOf<Layer.Services<typeof selectedParentLayer>>()
    if (false) {
      // @ts-expect-error The selected root Layer's host Service remains required.
      embed(pendingProgram)
    }
    const program = pendingProgram.provide({
      services: Layer.succeed(ParentService, { value: 'provided' }),
    })
    expect(parentConstructorRuns).toBe(0)
    const handle = embed(program)

    try {
      await vi.waitFor(() => expect(parentConstructorRuns).toBe(1))
      expect(parentViewRuns).toBeGreaterThan(0)

      await vi.waitFor(() => {
        expect(wrapper.textContent).toContain('Child value: 7')
      })
      expect(wrapper.textContent).toContain('Child value: 7')
    } finally {
      await handle.dispose()
      wrapper.remove()
    }
  })

  it('keeps the declared Block and selected implementation Layer channels exact', () => {
    expectTypeOf<Layer.Services<typeof selectedParentLayer>>().not.toBeAny()
    expectTypeOf<
      Layer.Services<typeof selectedParentLayerWithAlternativeChild>
    >().not.toBeAny()
    expectTypeOf<Layer.Services<typeof parentLayer>>().not.toBeAny()
    expectTypeOf<Layer.Error<typeof parentLayer>>().toEqualTypeOf<never>()
    expectTypeOf(Child.Model).toEqualTypeOf<typeof ChildModel>()
    expectTypeOf<Layer.Services<typeof childLayer>>().toEqualTypeOf<never>()
    expectTypeOf<LayerFacts<typeof childLayer>>().not.toBeAny()
    expectTypeOf<LayerFacts<typeof parentLayer>['view']>().not.toBeAny()
    expectTypeOf<
      LayerFacts<typeof parentLayer>['view']
    >().not.toEqualTypeOf<never>()
  })

  it('acquires the explicit public Block and selected Layer pair in withBlock', async () => {
    const testLayer = Layer.provide(
      selectedParentLayer,
      Layer.succeed(ParentService, { value: 'test' }),
    )

    await Effect.runPromise(
      withBlock({ block: Parent, layer: testLayer }, selected => {
        expect(selected.Model).toBe(ParentModel)
        expect(selected.Message).not.toBe(ParentMessage)
        expect(selected.view).toBeTypeOf('function')
      }),
    )
  })

  it('rejects a foreign selected Layer supplied by an erased caller', async () => {
    const use = vi.fn()
    const acquire = Reflect.apply(withBlock, undefined, [
      { block: Child, layer: foreignChildLayer },
      use,
    ])

    await expect(Effect.runPromise(acquire)).rejects.toThrow()
    expect(use).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'acquires the selected same-Block Layer alternative when isAlternative is %s',
    async isAlternative => {
      const layer = isAlternative ? alternativeChildLayer : childLayer

      await Effect.runPromise(
        withBlock({ block: Child, layer }, selected => {
          expect(selected.init().model.value).toBe(isAlternative ? 9 : 7)
        }),
      )
    },
  )

  it('selects its implementation from a merged Layer with other Blocks and Services', async () => {
    const layer = Layer.mergeAll(
      childLayer,
      foreignChildLayer,
      Layer.succeed(ParentService, { value: 'merged' }),
    )

    await Effect.runPromise(
      withBlock({ block: Child, layer }, selected =>
        Effect.map(ParentService, service => {
          expect(selected.init().model.value).toBe(7)
          expect(service.value).toBe('merged')
        }),
      ),
    )
  })

  it('runs a Story against the explicit public Block and selected Layer pair', async () => {
    const selectedStory = Story.story(
      { block: Parent, layer: selectedParentLayer },
      Story.given({ child: { value: 7 } }),
    )
    expectTypeOf<Effect.Success<typeof selectedStory>>().toEqualTypeOf<
      typeof Parent.Model.Type
    >()
    expectTypeOf<Effect.Error<typeof selectedStory>>().toEqualTypeOf<never>()
    expectTypeOf<
      Effect.Services<typeof selectedStory>
    >().toEqualTypeOf<ParentService>()

    const finalModel = await Effect.runPromise(
      selectedStory.pipe(
        Effect.provideService(ParentService, { value: 'story' }),
      ),
    )
    expect(finalModel).toEqual({ child: { value: 7 } })
  })

  it('runs a Scene against the explicit public Block and selected Layer pair', async () => {
    const testLayer = Layer.provide(
      selectedParentLayer,
      Layer.succeed(ParentService, { value: 'scene' }),
    )
    await Effect.runPromise(
      Scene.scene(
        { block: Parent, layer: testLayer },
        Scene.given({ child: { value: 7 } }),
        Scene.expect(Scene.text('Child value: 7')).toExist(),
      ),
    )
  })

  it('keeps selected Subscription and Mount facts on the matching Block', async () => {
    await Effect.runPromise(
      withBlock({ block: LifecycleBlock, layer: lifecycleLayer }, selected => {
        expect(Object.keys(selected.subscriptions)).toEqual(['pulse'])
        expectTypeOf<
          keyof typeof selected.subscriptions
        >().toEqualTypeOf<'pulse'>()
      }),
    )
  })

  it('renders a selected public Block and ordinary Layer through Server', async () => {
    const rendered = await Effect.runPromise(
      Server.renderToString(
        { block: DocumentBlock, layer: documentLayer },
        {},
        { isHydratable: false },
      ),
    )

    expect(rendered.html).toContain('<main>Preview</main>')
  })
})
