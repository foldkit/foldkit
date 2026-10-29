// @vitest-environment node
import { Effect, Layer, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeNamespace } from '../../block/define.js'
import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import type { Url } from '../../url/index.js'
import { renderToString } from './server.js'

const ChildNamespace = makeNamespace('ServerChild')
const ChildModel = Schema.Struct({ title: Schema.String })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  ClickedPrepare: {},
  CompletedPrepare: {},
  CompletedObserve: {},
})
type ChildMessage = typeof ChildMessage.Type
let constructions = 0
let executions = 0
const Prepare = ChildNamespace.makeCommand('Prepare', {
  messages: [ChildMessage.CompletedPrepare],
  handler: function* () {
    yield* Effect.sync(() => {
      constructions += 1
    })

    return () =>
      Effect.sync(() => {
        executions += 1
        return ChildMessage.CompletedPrepare()
      })
  },
})
const Observe = ChildNamespace.makeMount('Observe', {
  messages: [ChildMessage.CompletedObserve],
  handler: function* () {
    yield* Effect.sync(() => {
      constructions += 1
    })

    return () =>
      Effect.sync(() => {
        executions += 1
        return ChildMessage.CompletedObserve()
      })
  },
})

const child = ChildNamespace.makeDefinition({
  Model: ChildModel,
  Message: ChildMessage,
}).makeComposition({ mounts: [Observe] })
const childImplementation = {
  init: (title: string) => ({ model: { title }, commands: [Prepare()] }),
  update: child.makeUpdate({
    CompletedObserve: model => ({ model }),
    ClickedPrepare: model => ({ model }),
    CompletedPrepare: model => ({ model }),
  }),
  view: child.makeView((model, h) =>
    h.button(
      [h.OnMount(Observe()), h.OnClick(ChildMessage.ClickedPrepare())],
      [model.title],
    ),
  ),
  EffectsLayer: Layer.merge(Prepare.layer, Observe.layer),
}
const prepareChildBlock = () => child.prepareBlock(childImplementation)
const childBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const RootModel = Schema.Struct({ title: Schema.String })
type RootModel = typeof RootModel.Type
const RootApplicationDefinition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: Schema.Never,
})
const PlainMessage = Schema.Never
type PlainMessage = typeof PlainMessage.Type
const ChildBinding = RootApplicationDefinition.makeBinding(childBlock, {
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
})
const RegisteredApplication = RootApplicationDefinition.makeComposition({
  bindings: [ChildBinding],
})
const rootImplementation = {
  init: RegisteredApplication.makeInit(() =>
    ChildBinding.init({
      args: ['Server-rendered child'],
      toParentModel: child => child,
    }),
  ),
  update: RegisteredApplication.makeUpdate({}),
  view: RegisteredApplication.makeView((model, h) => ({
    title: model.title,
    body: h.div(
      [],
      [h.block(ChildBinding.embedView({ slotId: 'child', model }))],
    ),
  })),
  EffectsLayer: Layer.empty,
}

const ServerFlags = Schema.Struct({ title: Schema.String })
type ServerFlags = typeof ServerFlags.Type

const FlagsComposition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: PlainMessage,
}).makeComposition()
const flagsImplementation = {
  init: (flags: ServerFlags) => ({ model: { title: flags.title } }),
  update: FlagsComposition.makeUpdate({}),
  view: FlagsComposition.makeView((model, h) => ({
    title: model.title,
    body: h.main([], [model.title]),
  })),
  EffectsLayer: Layer.empty,
}

const RoutingComposition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: PlainMessage,
}).makeComposition()
const routingImplementation = {
  init: (url: Url) => ({ model: { title: url.pathname } }),
  update: RoutingComposition.makeUpdate({}),
  view: RoutingComposition.makeView((model, h) => ({
    title: model.title,
    body: h.main([], [model.title]),
  })),
  EffectsLayer: Layer.empty,
}

const RoutingFlagsComposition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: PlainMessage,
}).makeComposition()
const routingFlagsImplementation = {
  init: (flags: ServerFlags, url: Url) => ({
    model: { title: `${flags.title}${url.pathname}` },
  }),
  update: RoutingFlagsComposition.makeUpdate({}),
  view: RoutingFlagsComposition.makeView((model, h) => ({
    title: model.title,
    body: h.main([], [model.title]),
  })),
  EffectsLayer: Layer.empty,
}

const DataComposition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: PlainMessage,
}).makeComposition()
const dataImplementation = {
  init: () => ({ model: { title: 'data' } }),
  update: DataComposition.makeUpdate({}),
  EffectsLayer: Layer.empty,
}

const HtmlComposition = Block.makeDefinition('Application', {
  Model: RootModel,
  Message: PlainMessage,
}).makeComposition()
const htmlImplementation = {
  init: () => ({ model: { title: 'html' } }),
  update: HtmlComposition.makeUpdate({}),
  view: HtmlComposition.makeView((model, h) => h.main([], [model.title])),
  EffectsLayer: Layer.empty,
}

const OtherFlags = Schema.Struct({ count: Schema.Number })
type OtherFlags = typeof OtherFlags.Type

const prepareRootBlock = () =>
  RegisteredApplication.prepareBlock(rootImplementation)
const RootBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareRootBlock
> = Block.assemble(prepareRootBlock)
const prepareFlagsBlock = () =>
  FlagsComposition.prepareBlock(flagsImplementation)
const FlagsBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareFlagsBlock
> = Block.assemble(prepareFlagsBlock)
const prepareRoutingBlock = () =>
  RoutingComposition.prepareBlock(routingImplementation)
const RoutingBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareRoutingBlock
> = Block.assemble(prepareRoutingBlock)
const prepareRoutingFlagsBlock = () =>
  RoutingFlagsComposition.prepareBlock(routingFlagsImplementation)
const RoutingFlagsBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareRoutingFlagsBlock
> = Block.assemble(prepareRoutingFlagsBlock)
const prepareDataBlock = () => DataComposition.prepareBlock(dataImplementation)
const DataBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof RootModel,
  typeof prepareDataBlock
> = Block.assemble(prepareDataBlock)
const prepareHtmlBlock = () => HtmlComposition.prepareBlock(htmlImplementation)
const HtmlBlock: Block.FromAssemblyWithView<
  typeof RootModel,
  typeof prepareHtmlBlock
> = Block.assemble(prepareHtmlBlock)

const verifyServerBlockContracts = (): void => {
  const rootRender = renderToString(RootBlock, {}, { isHydratable: false })
  const flagsRender = renderToString(
    FlagsBlock,
    { Flags: ServerFlags },
    { flags: { title: 'flags' }, isHydratable: false },
  )
  const routingRender = renderToString(
    RoutingBlock,
    { routing: {} },
    { url: 'https://foldkit.dev/docs', isHydratable: false },
  )
  const routingFlagsRender = renderToString(
    RoutingFlagsBlock,
    { Flags: ServerFlags, routing: {} },
    {
      flags: { title: 'flags' },
      url: 'https://foldkit.dev/docs',
      isHydratable: false,
    },
  )

  const invalidDataRender = renderToString(
    // @ts-expect-error The completed root must have a default Document view.
    DataBlock,
    {},
    { isHydratable: false },
  )
  const invalidHtmlRender = renderToString(
    // @ts-expect-error An embedded Html view cannot own the rendered Document.
    HtmlBlock,
    {},
    { isHydratable: false },
  )
  const invalidFlagsValueRender = renderToString(
    FlagsBlock,
    // @ts-expect-error The render input must match the Flags Schema.
    { Flags: ServerFlags },
    { flags: { title: 1 }, isHydratable: false },
  )
  const invalidFlagsSchemaRender = renderToString(
    FlagsBlock,
    // @ts-expect-error The host Flags Schema must match the root initializer.
    { Flags: OtherFlags },
    { flags: { count: 1 }, isHydratable: false },
  )
  const invalidRoutingRender = renderToString(
    RootBlock,
    // @ts-expect-error URL initialization must be accepted by the root initializer.
    { routing: {} },
    { url: 'https://foldkit.dev', isHydratable: false },
  )
  const invalidRoutingMode = renderToString(
    RoutingBlock,
    // @ts-expect-error Enabling URL initialization requires a routing configuration object.
    { routing: undefined },
    { url: 'https://foldkit.dev', isHydratable: false },
  )
  const duplicatedImplementation = {
    Flags: ServerFlags,
    init: flagsImplementation.init,
  }
  const invalidHostConfigRender = renderToString(
    FlagsBlock,
    // @ts-expect-error Host configuration cannot replace completed Block behavior.
    duplicatedImplementation,
    { flags: { title: 'flags' }, isHydratable: false },
  )

  void [
    rootRender,
    flagsRender,
    routingRender,
    routingFlagsRender,
    invalidDataRender,
    invalidHtmlRender,
    invalidFlagsValueRender,
    invalidFlagsSchemaRender,
    invalidRoutingRender,
    invalidRoutingMode,
    invalidHostConfigRender,
  ]
}

void verifyServerBlockContracts

describe('completed root Block server rendering', () => {
  it('rejects an erased Flags configuration before encoding', () => {
    expect(() =>
      Reflect.apply(renderToString, undefined, [
        FlagsBlock,
        { Flags: {} },
        { flags: { title: 'Invalid schema' }, isHydratable: false },
      ]),
    ).toThrow('Server Flags must be an Effect Schema')
  })

  it('rejects an erased Html root before attempting Document serialization', async () => {
    const render = Reflect.apply(renderToString, undefined, [
      HtmlBlock,
      {},
      { isHydratable: false },
    ])

    await expect(Effect.runPromise(render)).rejects.toThrow(
      'requires a Document view',
    )
  })

  it('rejects an erased routing configuration that cannot enable URL initialization', () => {
    expect(() =>
      Reflect.apply(renderToString, undefined, [
        RoutingBlock,
        { routing: undefined },
        { url: 'https://foldkit.dev', isHydratable: false },
      ]),
    ).toThrow('Server routing must be a configuration object')
  })

  it('renders a graphless completed Block', async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        FlagsBlock,
        { Flags: ServerFlags },
        { flags: { title: 'Graphless root' }, isHydratable: false },
      ),
    )

    expect(rendered.title).toBe('Graphless root')
    expect(rendered.html).toContain('Graphless root')
  })

  it('renders registered child boundaries without constructing or executing handlers', async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        RootBlock,
        {},
        {
          isHydratable: false,
        },
      ),
    )
    expect(rendered.title).toBe('Server-rendered child')
    expect(rendered.html).toContain('Server-rendered child')
    expect(constructions).toBe(0)
    expect(executions).toBe(0)
  })
})
