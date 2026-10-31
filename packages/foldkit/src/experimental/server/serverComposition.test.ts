// @vitest-environment node
import { Effect, Layer, Schema, Stream } from 'effect'
import { describe, expect, it } from 'vitest'

import { Block } from '../../blocks/block.js'
import * as Command from '../../command/index.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Mount from '../../mount/index.js'
import type { Url } from '../../url/index.js'
import { FOLDKIT_APP_ATTRIBUTE, renderToString } from './server.js'

const BUILD_ID = 'test-build-id'

const ChildMessage = defineMessageUnion({
  ClickedPrepare: {},
  CompletedPrepare: {},
  CompletedObserve: {},
  Ticked: {},
})

const Prepare = Command.define('Prepare', {
  messages: [ChildMessage.CompletedPrepare],
})

const Observe = Mount.define('Observe', {
  messages: [ChildMessage.CompletedObserve],
})

class Child extends Block<Child, { readonly title: string }>()('Child', {
  Model: Schema.Struct({ title: Schema.String }),
  Message: ChildMessage,
  Command: [Prepare],
  Mount: [Observe],
}) {}

const events: Array<string> = []

const ChildLive = Child.make(
  Effect.fn(function* (_id, { title }) {
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        events.push('acquired')
      }),
      () =>
        Effect.sync(() => {
          events.push('released')
        }),
    )

    return {
      model: { title },
      start: [Prepare()],
      stream: Stream.sync(() => {
        events.push('streamed')
        return Child.Message.Ticked()
      }),
      update: {
        ClickedPrepare: model => ({ model }),
        CompletedPrepare: model => ({ model }),
        CompletedObserve: model => ({ model }),
        Ticked: model => ({ model }),
      },
      commands: {
        Prepare: () =>
          Effect.sync(() => {
            events.push('executed')
            return Child.Message.CompletedPrepare()
          }),
      },
      mounts: {
        Observe: () =>
          Effect.sync(() => {
            events.push('mounted')
            return Child.Message.CompletedObserve()
          }),
      },
      view: (model, h) =>
        h.button(
          [h.OnMount(Observe()), h.OnClick(Child.Message.ClickedPrepare())],
          [model.title],
        ),
    }
  }),
)

class Root extends Block<Root>()('Root', {
  Model: Schema.Struct({ child: Child }),
}) {}

const RootLive = Root.make(
  Effect.fn(function* () {
    const child = yield* new Child('child', { title: 'Server-rendered child' })
    return {
      model: { child },
      view: (model, h) => ({
        title: model.child.model.title,
        body: h.div([], [model.child.view()]),
      }),
    }
  }),
).pipe(Layer.provide(ChildLive))

const ServerFlags = Schema.Struct({ title: Schema.String })
type ServerFlags = typeof ServerFlags.Type

class FlagsRoot extends Block<FlagsRoot, { readonly flags: ServerFlags }>()(
  'FlagsRoot',
  { Model: Schema.Struct({ title: Schema.String }) },
) {}

const FlagsRootLive = FlagsRoot.make(
  Effect.fn(function* (_id, { flags }) {
    return {
      model: { title: flags.title },
      view: (model, h) => ({
        title: model.title,
        body: h.main([], [model.title]),
      }),
    }
  }),
)

class RoutingRoot extends Block<RoutingRoot, { readonly url: Url }>()(
  'RoutingRoot',
  { Model: Schema.Struct({ title: Schema.String }) },
) {}

const RoutingRootLive = RoutingRoot.make(
  Effect.fn(function* (_id, { url }) {
    return {
      model: { title: url.pathname },
      view: (model, h) => ({
        title: model.title,
        body: h.main([], [model.title]),
      }),
    }
  }),
)

class RoutingFlagsRoot extends Block<
  RoutingFlagsRoot,
  { readonly flags: ServerFlags; readonly url: Url }
>()('RoutingFlagsRoot', { Model: Schema.Struct({ title: Schema.String }) }) {}

const RoutingFlagsRootLive = RoutingFlagsRoot.make(
  Effect.fn(function* (_id, { flags, url }) {
    return {
      model: { title: `${flags.title}${url.pathname}` },
      view: (model, h) => ({
        title: model.title,
        body: h.main([], [model.title]),
      }),
    }
  }),
)

class HtmlRoot extends Block<HtmlRoot>()('HtmlRoot', {
  Model: Schema.Struct({ title: Schema.String }),
}) {}

const HtmlRootLive = HtmlRoot.make(
  Effect.fn(function* () {
    return {
      model: { title: 'html' },
      view: (model, h) => h.main([], [model.title]),
    }
  }),
)

const OtherFlags = Schema.Struct({ count: Schema.Number })

const verifyServerContracts = (): void => {
  const rootRender = renderToString(Root, { layer: RootLive })
  const flagsRender = renderToString(
    FlagsRoot,
    { layer: FlagsRootLive, Flags: ServerFlags },
    { flags: { title: 'flags' }, isHydratable: false },
  )
  const routingRender = renderToString(
    RoutingRoot,
    { layer: RoutingRootLive },
    { url: 'https://foldkit.dev/docs', isHydratable: false },
  )
  const routingFlagsRender = renderToString(
    RoutingFlagsRoot,
    { layer: RoutingFlagsRootLive, Flags: ServerFlags },
    {
      flags: { title: 'flags' },
      url: 'https://foldkit.dev/docs',
      isHydratable: false,
    },
  )

  const invalidFlagsValueRender = renderToString(
    FlagsRoot,
    { layer: FlagsRootLive, Flags: ServerFlags },
    // @ts-expect-error The render input must match the Flags Schema.
    { flags: { title: 1 }, isHydratable: false },
  )
  const invalidFlagsSchemaRender = renderToString(
    FlagsRoot,
    // @ts-expect-error The Flags Schema must match the root constructor args.
    { layer: FlagsRootLive, Flags: OtherFlags },
    { flags: { title: 'flags' }, isHydratable: false },
  )
  // @ts-expect-error A root that takes a URL requires the request URL.
  const missingUrlRender = renderToString(RoutingRoot, {
    layer: RoutingRootLive,
  })
  const unexpectedUrlRender = renderToString(
    Root,
    { layer: RootLive },
    // @ts-expect-error A root that takes no URL accepts none.
    { url: 'https://foldkit.dev', isHydratable: false },
  )
  const mismatchedLayerRender = renderToString(
    Root,
    // @ts-expect-error The Layer must provide the root Block.
    { layer: FlagsRootLive },
  )

  void [
    rootRender,
    flagsRender,
    routingRender,
    routingFlagsRender,
    invalidFlagsValueRender,
    invalidFlagsSchemaRender,
    missingUrlRender,
    unexpectedUrlRender,
    mismatchedLayerRender,
  ]
}

void verifyServerContracts

describe('root Block server rendering', () => {
  it('rejects an erased Flags configuration before encoding', () => {
    expect(() =>
      Reflect.apply(renderToString, undefined, [
        FlagsRoot,
        { layer: FlagsRootLive, Flags: {} },
        { flags: { title: 'Invalid schema' }, isHydratable: false },
      ]),
    ).toThrow('Server Flags must be an Effect Schema')
  })

  it('rejects a configuration without the root Layer', () => {
    expect(() =>
      Reflect.apply(renderToString, undefined, [
        Root,
        {},
        { isHydratable: false },
      ]),
    ).toThrow('must include the root Block `layer`')
  })

  it('constructs the root from the Flags', async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        FlagsRoot,
        { layer: FlagsRootLive, Flags: ServerFlags },
        { flags: { title: 'Flags root' }, isHydratable: false },
      ),
    )

    expect(rendered.title).toBe('Flags root')
    expect(rendered.html).toBe('<main>Flags root</main>')
  })

  it('constructs the root from the request URL and the Flags', async () => {
    const routed = await Effect.runPromise(
      renderToString(
        RoutingRoot,
        { layer: RoutingRootLive },
        { url: 'https://foldkit.dev/docs', isHydratable: false },
      ),
    )
    const both = await Effect.runPromise(
      renderToString(
        RoutingFlagsRoot,
        { layer: RoutingFlagsRootLive, Flags: ServerFlags },
        {
          url: 'https://foldkit.dev/docs',
          flags: { title: 'flags' },
          isHydratable: false,
        },
      ),
    )

    expect(routed.html).toBe('<main>/docs</main>')
    expect(both.html).toBe('<main>flags/docs</main>')
  })

  it('renders an Html root view as a Document titled with the root Block id', async () => {
    const rendered = await Effect.runPromise(
      renderToString(
        HtmlRoot,
        { layer: HtmlRootLive },
        { isHydratable: false },
      ),
    )

    expect(rendered.title).toBe('HtmlRoot')
    expect(rendered.html).toBe('<main>html</main>')
  })

  it('renders child instances without running Commands, Mounts, or Streams, and releases them afterwards', async () => {
    events.length = 0
    const rendered = await Effect.runPromise(
      renderToString(Root, { layer: RootLive }, { buildId: BUILD_ID }),
    )

    expect(rendered.title).toBe('Server-rendered child')
    expect(rendered.html).toContain(`${FOLDKIT_APP_ATTRIBUTE}="app"`)
    expect(rendered.html).toContain('Server-rendered child')
    expect(events).toEqual(['acquired', 'released'])
  })
})
