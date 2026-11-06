import {
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  SchemaTransformation,
} from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { UrlRequest } from '../navigation/urlRequest.js'
import { modifyFields } from '../struct/index.js'
import * as Url from '../url/index.js'
import { normalizeRoutingConfig } from './browserListeners.js'
import { __setDevToolsOverlay } from './devToolsConfig.js'
import * as ModelPreservationBridge from './modelPreservationBridge.js'
import { resolveProgramDevToolsConfig } from './program.js'
import * as Program from './programPublic.js'
import { assertElementHtml, assertProgramConfig } from './programRoot.js'
import { embed } from './start.js'

class RootSource extends Context.Service<
  RootSource,
  Readonly<{ read: Effect.Effect<string> }>
>()('ProgramRoot/RootSource') {}

beforeEach(() => {
  vi.spyOn(ModelPreservationBridge, 'resolvePreservedModel').mockReturnValue(
    Effect.succeed(undefined),
  )
})

afterEach(() => {
  __setDevToolsOverlay(undefined)
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('completed root Block hosting', () => {
  it('derives external dispatch only for an explicit DevTools opt-in', () => {
    const Message = defineMessageUnion({ ClickedIncrement: {} })
    type Message = typeof Message.Type

    expect(resolveProgramDevToolsConfig(undefined, Message)).toBeUndefined()
    expect(resolveProgramDevToolsConfig(false, Message)).toBe(false)
    expect(resolveProgramDevToolsConfig({}, Message)).toEqual({})
    expect(resolveProgramDevToolsConfig({ dispatch: false }, Message)).toEqual({
      dispatch: false,
    })
    expect(
      resolveProgramDevToolsConfig({ dispatch: true, show: 'Always' }, Message),
    ).toEqual({
      dispatch: true,
      dispatchSchema: Message,
      show: 'Always',
    })
  })

  it('hosts a message-free page without Flags or ordinary Service providers', () => {
    const ProgramPageComposition = Block.makeDefinition('ProgramPage', {
      Model: Schema.Struct({ count: Schema.Number }),
      Message: Schema.Never,
    }).makeComposition()
    const prepareProgramPageBlock = () =>
      ProgramPageComposition.prepareBlock({
        init: ProgramPageComposition.makeInit(() => ({ model: { count: 0 } })),
        update: ProgramPageComposition.makeUpdate({}),
        view: ProgramPageComposition.makeView((model, h) => ({
          title: 'Counter',
          body: h.div([], [globalThis.String(model.count)]),
        })),
      })
    const ProgramPageBlock: Block.FromAssemblyWithView<
      typeof ProgramPageComposition.Model,
      typeof prepareProgramPageBlock
    > = Block.assemble(prepareProgramPageBlock)
    const program = Program.make({
      block: ProgramPageBlock,
      container: document.createElement('div'),
    })

    expect(program.start).toBeTypeOf('function')
  })

  it('installs DevTools without evaluating the Message codec during startup', async () => {
    const decode = vi.fn((value: string) => Effect.succeed(value.trim()))
    const TrimmedString = Schema.String.pipe(
      Schema.decodeTo(
        Schema.String,
        SchemaTransformation.transformEffect({
          decode,
          encode: Effect.succeed,
        }),
      ),
    )
    type TrimmedString = typeof TrimmedString.Type
    const Message = defineMessageUnion({
      SubmittedValue: { value: TrimmedString },
    })
    type Message = typeof Message.Type
    const Definition = Block.makeDefinition('PureDecodedRoot', {
      Model: Schema.Struct({ value: Schema.String }),
      Message,
    })
    const Composition = Definition.makeComposition()
    const prepare = () =>
      Composition.prepareBlock({
        init: Composition.makeInit(() => ({ model: { value: 'ready' } })),
        update: Composition.makeUpdate({
          SubmittedValue: (model, { value }) => ({
            model: modifyFields(model, { value: () => value }),
          }),
        }),
        view: Composition.makeView((model, h) => h.div([], [model.value])),
      })
    const ApplicationBlock: Block.FromAssemblyWithView<
      typeof Composition.Model,
      typeof prepare
    > = Block.assemble(prepare)
    const installOverlay = vi.fn(() => Effect.void)
    __setDevToolsOverlay(installOverlay)
    const container = document.createElement('div')
    container.id = 'pure-decoded-dispatch'
    document.body.append(container)

    expect(decode).not.toHaveBeenCalled()

    const handle = embed(
      Program.makeElement({
        block: ApplicationBlock,
        container,
        devTools: { show: 'Always', dispatch: true },
      }),
    )

    try {
      await vi.waitFor(() => expect(installOverlay).toHaveBeenCalledTimes(1))
      await vi.waitFor(() => expect(document.body.textContent).toBe('ready'))
      expect(decode).not.toHaveBeenCalled()
    } finally {
      handle.dispose()
    }
  })

  it('constructs nothing until Runtime starts and retains one handler lifetime', async () => {
    let initializerCalls = 0
    let handlerAcquisitions = 0
    let handlerReleases = 0
    let serviceReads = 0

    const Model = Schema.Struct({ value: Schema.String })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({
      ClickedReadValue: {},
      CompletedReadValue: { value: Schema.String },
    })
    type Message = typeof Message.Type
    const ProgramRootDefinition = Block.makeDefinition('ProgramRoot', {
      Model,
      Message,
    })
    const ReadValue = ProgramRootDefinition.makeCommand('ReadValue', {
      messages: [Message.CompletedReadValue],
      handler: function* () {
        const source = yield* RootSource

        yield* Effect.acquireRelease(
          Effect.sync(() => {
            handlerAcquisitions += 1
          }),
          () =>
            Effect.sync(() => {
              handlerReleases += 1
            }),
        )

        return () =>
          source.read.pipe(
            Effect.map(value => Message.CompletedReadValue({ value })),
          )
      },
    })
    const ProgramRootComposition = ProgramRootDefinition.makeComposition()
    const init = ProgramRootComposition.makeInit(() => {
      initializerCalls += 1

      return { model: { value: 'Initial' } }
    })
    const update = ProgramRootComposition.makeUpdate({
      ClickedReadValue: model => ({ model, commands: [ReadValue()] }),
      CompletedReadValue: (model, { value }) => ({
        model: modifyFields(model, { value: () => value }),
      }),
    })
    const view = ProgramRootComposition.makeView((model, h) =>
      h.button([h.OnClick(Message.ClickedReadValue())], [model.value]),
    )
    const prepareProgramRootBlock = () =>
      ProgramRootComposition.prepareBlock({
        init,
        update,
        view,
        EffectsLayer: ReadValue.layer,
      })
    const ProgramRootBlock: Block.FromAssemblyWithView<
      typeof Model,
      typeof prepareProgramRootBlock
    > = Block.assemble(prepareProgramRootBlock)
    const container = document.createElement('div')
    container.id = 'program-root'
    document.body.append(container)

    const program = Program.makeElement({
      block: ProgramRootBlock,
      container,
      devTools: false,
      slow: false,
    }).provide(
      Layer.succeed(RootSource, {
        read: Effect.sync(() => {
          serviceReads += 1

          return 'Read value'
        }),
      }),
    )

    expect(initializerCalls).toBe(0)
    expect(handlerAcquisitions).toBe(0)
    expect(handlerReleases).toBe(0)
    expect(serviceReads).toBe(0)

    const handle = embed(program)

    try {
      await vi.waitFor(() => expect(document.body.textContent).toBe('Initial'))
      document.querySelector('button')?.click()
      await vi.waitFor(() =>
        expect(document.body.textContent).toBe('Read value'),
      )
      document.querySelector('button')?.click()
      await vi.waitFor(() => expect(serviceReads).toBe(2))

      expect(initializerCalls).toBe(1)
      expect(handlerAcquisitions).toBe(1)
      expect(handlerReleases).toBe(0)
    } finally {
      handle.dispose()
      container.remove()
    }

    await vi.waitFor(() => expect(handlerReleases).toBe(1))
  })

  it('wraps canonical routing payloads and preserves custom callback inputs', () => {
    const Message = defineMessageUnion({
      ClickedLink: { request: UrlRequest },
      ChangedUrl: { url: Url.Url },
    })
    type Message = typeof Message.Type
    const url = Option.getOrThrow(Url.fromString('https://foldkit.dev/docs'))
    const request = UrlRequest.Internal({ url })
    const constructors = normalizeRoutingConfig({
      onUrlRequest: Message.ClickedLink,
      onUrlChange: Message.ChangedUrl,
    })
    const callbacks = normalizeRoutingConfig({
      onUrlRequest: request => Message.ClickedLink({ request }),
      onUrlChange: url => Message.ChangedUrl({ url }),
    })

    expect(constructors.onUrlRequest(request)).toEqual(
      Message.ClickedLink({ request }),
    )
    expect(constructors.onUrlChange(url)).toEqual(Message.ChangedUrl({ url }))
    expect(callbacks.onUrlRequest(request)).toEqual(
      constructors.onUrlRequest(request),
    )
    expect(callbacks.onUrlChange(url)).toEqual(constructors.onUrlChange(url))
  })

  it('rejects malformed erased host configurations before lowering', () => {
    const ErasedRootComposition = Block.makeDefinition('ErasedRoot', {
      Model: Schema.Struct({ value: Schema.String }),
      Message: Schema.Never,
    }).makeComposition()
    const prepareErasedRootBlock = () =>
      ErasedRootComposition.prepareBlock({
        init: () => ({ model: { value: 'ready' } }),
        update: ErasedRootComposition.makeUpdate({}),
        view: ErasedRootComposition.makeView((model, h) =>
          h.div([], [model.value]),
        ),
      })
    const ErasedRootBlock: Block.FromAssemblyWithView<
      typeof ErasedRootComposition.Model,
      typeof prepareErasedRootBlock
    > = Block.assemble(prepareErasedRootBlock)

    expect(() =>
      assertProgramConfig(
        { block: ErasedRootBlock, container: null, routing: undefined },
        'Document',
      ),
    ).toThrow('Program routing must supply')
    expect(() =>
      assertProgramConfig(
        { block: ErasedRootBlock, container: null, Flags: {} },
        'Element',
      ),
    ).toThrow('field "Flags" must be a Schema')
    expect(() =>
      assertProgramConfig(
        { block: ErasedRootBlock, container: null, Flags: Schema.String },
        'Element',
      ),
    ).toThrow('requires Flags and flags together')
    expect(() =>
      assertProgramConfig(
        {
          block: ErasedRootBlock,
          container: null,
          Flags: Schema.String,
          flags: 'ready',
        },
        'Element',
      ),
    ).toThrow('field "flags" must be an Effect')
    expect(() =>
      assertProgramConfig({ block: {}, container: null }, 'Element'),
    ).toThrow('supply its makeLayer implementation as layer')
    expect(() => assertProgramConfig({ container: null }, 'Element')).toThrow(
      'supply its makeLayer implementation as layer',
    )
    expect(() =>
      assertProgramConfig(
        { block: ErasedRootBlock, container: null, EffectsLayer: Layer.empty },
        'Element',
      ),
    ).toThrow('Return implementation fields from the Block')
    expect(() =>
      assertProgramConfig(
        {
          block: ErasedRootBlock,
          container: null,
          devTools: { Message: Schema.Never },
        },
        'Element',
      ),
    ).toThrow('DevTools configuration does not support "Message"')
    expect(() =>
      assertProgramConfig(
        {
          block: ErasedRootBlock,
          container: null,
          devTools: { dispatch: 'yes' },
        },
        'Element',
      ),
    ).toThrow('field "dispatch" must be a boolean')
    expect(() =>
      assertProgramConfig(
        { block: ErasedRootBlock, container: null, unsupported: true },
        'Element',
      ),
    ).toThrow('configuration does not support "unsupported"')
    expect(() => assertElementHtml(42)).toThrow(
      'Program.makeElement requires an Html view',
    )
  })
})
