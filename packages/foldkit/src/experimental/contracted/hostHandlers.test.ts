import { Context, Data, Effect, Layer, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as ModelPreservationBridge from '../../runtime/modelPreservationBridge.js'
import * as Program from '../../runtime/programPublic.js'
import { embed } from '../../runtime/start.js'
import * as Story from '../../story/public.js'
import { modifyFields } from '../../struct/index.js'
import * as Server from '../server/public.js'
import type { FactsOf } from './public.js'

const buildErasedHost = (block: object): Promise<unknown> =>
  Reflect.apply(Effect.runPromise, undefined, [
    Reflect.apply(Story.withBlock, undefined, [
      block,
      (executable: Readonly<{ EffectsLayer: unknown }>) =>
        Reflect.apply(Layer.build, undefined, [executable.EffectsLayer]),
    ]),
  ])

class HostValue extends Context.Service<
  HostValue,
  Readonly<{ value: string }>
>()('ContractedHostHandlers/HostValue') {}

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({
  CompletedReadValue: { value: Schema.String },
})
type Message = typeof Message.Type
const HostKey = Symbol('ContractedHostHandlers')
const HostDefinition = Block.makeDefinition('ContractedHostHandlers', {
  key: HostKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects: { services: [HostValue] },
  view: { kind: 'Element' },
})
const ReadValue = HostDefinition.makeCommand('ReadValue', {
  messages: [Message.CompletedReadValue],
})
const HostComposition = HostDefinition.makeComposition()
const init = HostComposition.makeInit(() => ({
  model: { value: '' },
  commands: [ReadValue()],
}))
const update = HostComposition.makeUpdate({
  CompletedReadValue: (model, { value }) => ({
    model: modifyFields(model, { value: () => value }),
  }),
})
const view = HostComposition.makeView((model, h) => h.div([], [model.value]))
const events: Array<string> = []
const PendingHostBlock = HostDefinition.makeBlock(
  Effect.gen(function* () {
    yield* Effect.acquireRelease(
      Effect.sync(() => events.push('graph acquired')),
      () => Effect.sync(() => events.push('graph released')),
    )

    return {
      children: [],
      init,
      update,
      view,
      hostHandlers: [ReadValue],
    }
  }),
)
const HostHandlers = ReadValue.toLayer(
  Effect.gen(function* () {
    const source = yield* HostValue
    yield* Effect.acquireRelease(
      Effect.sync(() => events.push('handler acquired')),
      () => Effect.sync(() => events.push('handler released')),
    )

    return () =>
      Effect.succeed(Message.CompletedReadValue({ value: source.value }))
  }),
)
const SelectedHostBlock = PendingHostBlock.provideHandlers(HostHandlers)

describe('ordinary Block host-handler selection', () => {
  it('retains exact readiness and handler Service evidence without constructing either Layer', () => {
    expect(events).toEqual([])
    expect(SelectedHostBlock.Model).toBe(HostDefinition.contract.Model)
    expect(SelectedHostBlock.Message).toBe(HostDefinition.contract.Message)
    expectTypeOf<
      FactsOf<typeof PendingHostBlock>['hostRequirements']
    >().not.toEqualTypeOf<never>()
    expectTypeOf<
      FactsOf<typeof SelectedHostBlock>['hostRequirements']
    >().toEqualTypeOf<never>()
    expectTypeOf<
      FactsOf<typeof SelectedHostBlock>['effectsLayerRequirements']
    >().toEqualTypeOf<HostValue>()
    expectTypeOf(SelectedHostBlock.provideHandlers).toEqualTypeOf<never>()
    expectTypeOf<Layer.Success<typeof SelectedHostBlock.layer>>().toEqualTypeOf<
      Effect.Services<typeof HostDefinition.contract.get>
    >()
  })

  it('keeps handler construction deferred in pure tests and releases graph resources', async () => {
    events.length = 0

    await Effect.runPromise(
      Story.withBlock(SelectedHostBlock, block => {
        expect(events).toEqual(['graph acquired'])
        const initial = block.init()
        expectTypeOf(initial.model).toEqualTypeOf<Model>()
        expectTypeOf(
          block.Message.CompletedReadValue({ value: '' }),
        ).toExtend<Message>()
        expect(initial.commands).toMatchObject([{ name: ReadValue.name }])
      }),
    )

    expect(events).toEqual(['graph acquired', 'graph released'])
  })

  it('returns the final Story Model and releases graph resources', async () => {
    events.length = 0

    const finalModel = await Effect.runPromise(
      Story.story(
        SelectedHostBlock,
        Story.init(),
        Story.Command.resolve(
          ReadValue,
          Message.CompletedReadValue({ value: 'resolved' }),
        ),
      ),
    )

    expectTypeOf(finalModel).toEqualTypeOf<Model>()
    expect(finalModel).toEqual({ value: 'resolved' })
    expect(events).toEqual(['graph acquired', 'graph released'])
  })

  it('releases graph resources when a Model comparison fails', async () => {
    events.length = 0

    await expect(
      Effect.runPromise(
        Story.story(
          SelectedHostBlock,
          Story.init(),
          Story.models(Story.steps(), () => {
            throw new Error('comparison failed')
          }),
          Story.Command.resolve(
            ReadValue,
            Message.CompletedReadValue({ value: 'resolved' }),
          ),
        ),
      ),
    ).rejects.toThrow('comparison failed')
    expect(events).toEqual(['graph acquired', 'graph released'])
  })

  it('builds the original provider under the handler scope and preserves cleanup order', async () => {
    events.length = 0

    await Effect.runPromise(
      Story.withBlock(SelectedHostBlock, block =>
        Effect.asVoid(Layer.build(block.EffectsLayer)),
      ).pipe(Effect.provideService(HostValue, { value: 'selected' })),
    )

    expect(events).toEqual([
      'graph acquired',
      'handler acquired',
      'handler released',
      'graph released',
    ])
  })

  it('executes selected host Commands through an ordinary Program and awaits scoped cleanup', async () => {
    events.length = 0
    const container = document.createElement('div')
    container.id = 'contracted-host-handlers'
    const wrapper = document.createElement('section')
    wrapper.append(container)
    document.body.append(wrapper)
    const preservation = vi
      .spyOn(ModelPreservationBridge, 'resolvePreservedModel')
      .mockReturnValue(Effect.succeed(undefined))
    const handle = embed(
      Program.makeElement({ block: SelectedHostBlock, container }).provide({
        services: Layer.succeed(HostValue, { value: 'from host' }),
      }),
    )

    try {
      await vi.waitFor(() => expect(wrapper.textContent).toBe('from host'))
    } finally {
      await handle.dispose()
      preservation.mockRestore()
      wrapper.remove()
    }

    expect(events).toEqual([
      'graph acquired',
      'handler acquired',
      'handler released',
      'graph released',
    ])
  })

  it('rejects acquisition before host handlers have been selected and closes constructor resources', async () => {
    events.length = 0

    await expect(
      Effect.runPromise(
        Reflect.apply(Story.withBlock, undefined, [
          PendingHostBlock,
          () => undefined,
        ]),
      ),
    ).rejects.toThrow('resolve its original host handlers with provideHandlers')

    expect(events).toEqual(['graph acquired', 'graph released'])
  })

  it('retains a selected provider constructor failure and closes the graph scope', async () => {
    class BuildFailure extends Data.TaggedError('BuildFailure')<{}> {}

    const failures: Array<string> = []
    const FailureKey = Symbol('HostHandlerFailure')
    const FailureDefinition = Block.makeDefinition('HostHandlerFailure', {
      key: FailureKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      effects: Block.makeEffectsContract<BuildFailure>(),
    })
    const ReadFailure = FailureDefinition.makeCommand('ReadFailure', {
      messages: [Message.CompletedReadValue],
    })
    const FailureComposition = FailureDefinition.makeComposition()
    const PendingFailure = FailureDefinition.makeBlock(
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => failures.push('acquired')),
          () => Effect.sync(() => failures.push('released')),
        )

        return {
          children: [],
          init: FailureComposition.makeInit(() => ({
            model: { value: '' },
            commands: [ReadFailure()],
          })),
          update: FailureComposition.makeUpdate({
            CompletedReadValue: model => ({ model }),
          }),
          hostHandlers: [ReadFailure],
        }
      }),
    )
    const SelectedFailure = PendingFailure.provideHandlers(
      ReadFailure.toLayer(
        Effect.fail(new BuildFailure()).pipe(
          Effect.as(() =>
            Effect.succeed(Message.CompletedReadValue({ value: '' })),
          ),
        ),
      ),
    )
    const failure = await Effect.runPromise(
      Story.withBlock(SelectedFailure, block =>
        Layer.build(block.EffectsLayer).pipe(Effect.flip),
      ),
    )

    expectTypeOf(failure).toEqualTypeOf<BuildFailure>()
    expect(failure).toEqual(new BuildFailure())
    expect(failures).toEqual(['acquired', 'released'])
  })

  it('rejects a same-shaped foreign provider by its original registration identity', async () => {
    const Foreign = Block.makeNamespace('ContractedForeignHostHandlers')
    const ForeignReadValue = Foreign.makeCommand('ReadValue', {
      messages: [Message.CompletedReadValue],
    })
    const forged = Reflect.apply(PendingHostBlock.provideHandlers, undefined, [
      ForeignReadValue.toLayer(
        Effect.succeed(() =>
          Effect.succeed(Message.CompletedReadValue({ value: 'foreign' })),
        ),
      ),
    ])

    await expect(buildErasedHost(forged)).rejects.toThrow()
  })

  it('rejects an erased empty provider when the selected handler Layer builds', async () => {
    const forged = Reflect.apply(PendingHostBlock.provideHandlers, undefined, [
      Layer.empty,
    ])

    await expect(buildErasedHost(forged)).rejects.toThrow(
      'did not provide its declared host handler',
    )
  })

  it('requires selection for Server acquisition without building selected handlers during SSR', async () => {
    const ServerKey = Symbol('HostHandlerServer')
    const ServerDefinition = Block.makeDefinition('HostHandlerServer', {
      key: ServerKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Document' },
      effects: { services: [HostValue] },
    })
    const ReadServerValue = ServerDefinition.makeCommand('ReadServerValue', {
      messages: [Message.CompletedReadValue],
    })
    const ServerComposition = ServerDefinition.makeComposition()
    const PendingServer = ServerDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: ServerComposition.makeInit(() => ({
          model: { value: 'SSR' },
          commands: [ReadServerValue()],
        })),
        update: ServerComposition.makeUpdate({
          CompletedReadValue: model => ({ model }),
        }),
        view: ServerComposition.makeView((model, h) => ({
          title: 'Hosted server',
          body: h.div([], [model.value]),
        })),
        hostHandlers: [ReadServerValue],
      }),
    )
    const SelectedServer = PendingServer.provideHandlers(
      ReadServerValue.toLayer(
        Effect.gen(function* () {
          const source = yield* HostValue

          return () =>
            Effect.succeed(Message.CompletedReadValue({ value: source.value }))
        }),
      ),
    )
    const rendered = await Effect.runPromise(
      Server.renderToString(SelectedServer, {}, { isHydratable: false }),
    )
    expect(rendered.html).toContain('SSR')

    await expect(
      Effect.runPromise(
        Reflect.apply(Server.renderToString, undefined, [
          PendingServer,
          {},
          { isHydratable: false },
        ]),
      ),
    ).rejects.toThrow('resolve its original host handlers with provideHandlers')
  })

  it('accepts the selected root and refuses an unresolved root through Program typing', () => {
    Program.makeElement({
      block: SelectedHostBlock,
      container: document.createElement('div'),
    })

    // @ts-expect-error Program roots must resolve every host-owned handler.
    Program.makeElement({
      block: PendingHostBlock,
      container: document.createElement('div'),
    })
  })

  it('refuses an erased unresolved Program before constructing any host handlers', async () => {
    events.length = 0
    const container = document.createElement('div')
    container.id = 'pending-contract-host'
    const pending = Reflect.apply(Program.makeElement, undefined, [
      { block: PendingHostBlock, container },
    ])

    await expect(
      Reflect.apply(Effect.runPromise, undefined, [
        Reflect.apply(Reflect.get(pending, 'start'), pending, []),
      ]),
    ).rejects.toThrow('resolve its original host handlers with provideHandlers')

    expect(events).toEqual(['graph acquired', 'graph released'])
  })

  it('retains host selection in either order around child implementation provisioning', async () => {
    const ChildKey = Symbol('HostSelectionChild')
    const ChildDefinition = Block.makeDefinition('HostSelectionChild', {
      key: ChildKey,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const ChildComposition = ChildDefinition.makeComposition()
    const ChildBlock = ChildDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: ChildComposition.makeInit(() => ({ model: 7 })),
        update: ChildComposition.makeUpdate({}),
      }),
    )
    const ParentKey = Symbol('HostSelectionParent')
    const ParentDefinition = Block.makeDefinition('HostSelectionParent', {
      key: ParentKey,
      Model: Schema.Struct({
        value: Schema.String,
        child: ChildDefinition.contract.Model,
      }),
      Message,
      InitArgs: Schema.Tuple([]),
      effects: { services: [HostValue] },
    })
    const ChildBinding = ParentDefinition.makeRequiredFieldBinding(
      ChildDefinition.contract,
      { field: 'child', init: { contextToArgs: () => [] } },
    )
    const ParentComposition = ParentDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const ReadParentValue = ParentDefinition.makeCommand('ReadParentValue', {
      messages: [Message.CompletedReadValue],
    })
    const PendingParent = ParentDefinition.makeBlock(
      Effect.gen(function* () {
        const child = yield* ChildBinding

        return {
          children: [child],
          init: ParentComposition.makeInit(() => ({
            model: { value: '' },
            commands: [ReadParentValue()],
          })),
          update: ParentComposition.makeUpdate({
            CompletedReadValue: model => ({ model }),
          }),
          hostHandlers: [ReadParentValue],
        }
      }),
    )
    const parentHandlers = ReadParentValue.toLayer(
      Effect.gen(function* () {
        const source = yield* HostValue

        return () =>
          Effect.succeed(Message.CompletedReadValue({ value: source.value }))
      }),
    )
    const ProvidedPending = PendingParent.provide(ChildBlock.layer)
    const SelectedThenProvided = PendingParent.provideHandlers(
      parentHandlers,
    ).provide(ChildBlock.layer)
    const ProvidedThenSelected = ProvidedPending.provideHandlers(parentHandlers)

    expectTypeOf<
      FactsOf<typeof ProvidedPending>['hostRequirements']
    >().not.toEqualTypeOf<never>()
    expectTypeOf<
      FactsOf<typeof ProvidedThenSelected>['effectsLayerRequirements']
    >().toEqualTypeOf<HostValue>()
    expectTypeOf<
      Layer.Services<typeof SelectedThenProvided.layer>
    >().toEqualTypeOf<never>()
    expectTypeOf<
      Layer.Services<typeof ProvidedThenSelected.layer>
    >().toEqualTypeOf<never>()

    for (const parent of [SelectedThenProvided, ProvidedThenSelected]) {
      await Effect.runPromise(
        Story.withBlock(parent, block => {
          expect(block.init().model).toEqual({ value: '', child: 7 })
        }),
      )
    }
  })
})
