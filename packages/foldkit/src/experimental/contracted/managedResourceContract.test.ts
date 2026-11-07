import { Array, Context, Effect, Layer, Option, Schema } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import * as ModelPreservationBridge from '../../runtime/modelPreservationBridge.js'
import * as Program from '../../runtime/programPublic.js'
import { embed } from '../../runtime/start.js'
import * as Story from '../../story/public.js'
import { modifyFields } from '../../struct/index.js'
import { snapshotDefinitionConfiguration } from './runtime.js'

const Namespace = Block.makeNamespace('ManagedResourceContractTest')
const Session = Namespace.makeResource<string>()('Session')
const Model = Schema.Struct({ label: Schema.String })
const Message = defineMessageUnion({
  RequestedRead: {},
  CompletedRead: { label: Schema.String },
  CompletedAcquire: {},
  CompletedRelease: {},
  FailedAcquire: {},
})
const InMessage = defineInMessageUnion({ RequestedRefresh: {} })
const config = { Model, Message, InMessage, InitArgs: Schema.Tuple([]) }

class Store extends Context.Service<Store, Readonly<{ label: string }>>()(
  'ManagedResourceContractTest/Store',
) {}

describe('ManagedResource contract requirement lists', () => {
  it('rejects the old requirement key at every public location for erased callers', () => {
    for (const declaration of [
      { effects: { resources: [Session] } },
      {
        operations: {
          read: { message: Message.RequestedRead, resources: [Session] },
        },
      },
      { inMessageOutputs: { RequestedRefresh: { resources: [Session] } } },
    ]) {
      expect(() =>
        Reflect.apply(Block.make, undefined, [
          'LegacyManagedResourceContract',
          {
            ...config,
            key: Symbol('LegacyManagedResourceContract'),
            ...declaration,
          },
        ]),
      ).toThrow(/resources has been renamed to .*managedResources/)
    }
  })

  it('snapshots renamed lists without changing the original ManagedResource identity', () => {
    const effects = [Session]
    const operation = [Session]
    const input = [Session]
    const snapshot = snapshotDefinitionConfiguration({
      ...config,
      key: Symbol('ManagedResourceContractSnapshot'),
      effects: { managedResources: effects },
      operations: {
        read: { message: Message.RequestedRead, managedResources: operation },
      },
      inMessageOutputs: { RequestedRefresh: { managedResources: input } },
    })

    effects.pop()
    operation.pop()
    input.pop()

    for (const retained of [
      snapshot.effects.managedResources,
      snapshot.operations.read.managedResources,
      snapshot.inMessageOutputs.RequestedRefresh.managedResources,
    ]) {
      expect(retained).toEqual([Session])
      expect(Object.isFrozen(retained)).toBe(true)
      expect(Option.getOrThrow(Array.head(retained))).toBe(Session)
    }
  })

  it('keeps construction passive and preserves original Command and resource lifecycles', async () => {
    const events: Array<string> = []
    const SessionKey = Symbol('ManagedResourceContractTest')
    const SessionBlock = Block.make(Namespace, {
      ...config,
      key: SessionKey,
      view: { kind: 'Element' },
      effects: { managedResources: [Session], services: [Store] },
      operations: {
        read: { message: Message.RequestedRead, managedResources: [Session] },
      },
      inMessageOutputs: { RequestedRefresh: { managedResources: [Session] } },
    })
    const Read = SessionBlock.makeCommand('Read', {
      messages: [Message.CompletedRead],
      handler: function* () {
        const store = yield* Store
        events.push('read handler')

        return () =>
          Session.get.pipe(
            Effect.map(label =>
              Message.CompletedRead({ label: `${store.label}:${label}` }),
            ),
            Effect.catch(() =>
              Effect.succeed(Message.CompletedRead({ label: 'missing' })),
            ),
          )
      },
    })
    const managedResources = SessionBlock.makeManagedResources(entry => ({
      session: entry('ManageSession', Schema.Option(Schema.Null), {
        resource: Session,
        modelToMaybeRequirements: () => Option.some(null),
        onAcquired: () => Message.CompletedAcquire(),
        onReleased: () => Message.CompletedRelease(),
        onAcquireError: () => Message.FailedAcquire(),
        handler: function* () {
          events.push('resource handler')

          return {
            acquire: () =>
              Effect.sync(() => {
                events.push('acquired')
                return 'ready'
              }),
            release: () =>
              Effect.sync(() => {
                events.push('released')
              }),
          }
        },
      }),
    }))
    const composition = SessionBlock.makeComposition()
    const layer = SessionBlock.makeLayer(
      Effect.succeed({
        children: [],
        init: composition.makeInit(() => ({
          model: Model.make({ label: '' }),
        })),
        update: composition.makeUpdate({
          RequestedRead: SessionBlock.makeCommandsStep(() => [Read()]),
          CompletedRead: (model, { label }) => ({
            model: modifyFields(model, { label: () => label }),
          }),
          CompletedAcquire: SessionBlock.makeCommandsStep(() => [Read()]),
          CompletedRelease: SessionBlock.makeNoopStep(),
          FailedAcquire: SessionBlock.makeNoopStep(),
        }),
        inMessageUpdate: composition.makeInMessageUpdate({
          RequestedRefresh: SessionBlock.makeCommandsStep(() => [Read()]),
        }),
        view: composition.makeView((model, h) => h.div([], [model.label])),
        managedResources,
        EffectsLayer: Layer.merge(Read.layer, managedResources.layer),
      }),
    )
    const subject = { block: SessionBlock, layer }

    expect(events).toEqual([])

    await Effect.runPromise(
      Story.withBlock(subject, executable => {
        const initialModel = executable.init().model
        const read = executable.operations.read(initialModel)
        const refresh = executable.operations.requestRefresh(initialModel)

        expect(events).toEqual([])
        expect(
          Option.flatMap(
            Array.head(read.commands ?? []),
            Story.Command.argsOf(Read),
          ),
        ).toEqual(Option.some(undefined))
        expect(
          Option.flatMap(
            Array.head(refresh.commands ?? []),
            Story.Command.argsOf(Read),
          ),
        ).toEqual(Option.some(undefined))
      }),
    )

    const container = document.createElement('div')
    container.id = 'managed-resource-contract'
    const wrapper = document.createElement('section')
    wrapper.append(container)
    document.body.append(wrapper)
    const preservation = vi
      .spyOn(ModelPreservationBridge, 'resolvePreservedModel')
      .mockReturnValue(Effect.succeed(undefined))
    const handle = embed(
      Program.makeElement({ ...subject, container }).provide(
        Layer.succeed(Store, { label: 'stored' }),
      ),
    )

    try {
      await vi.waitFor(() => expect(wrapper.textContent).toBe('stored:ready'))
      expect(events).toContain('read handler')
      expect(events).toContain('resource handler')
      expect(events).toContain('acquired')
      expect(events).not.toContain('released')
    } finally {
      await handle.dispose()
      preservation.mockRestore()
      wrapper.remove()
    }

    await vi.waitFor(() =>
      expect(Array.filter(events, event => event === 'released')).toHaveLength(
        1,
      ),
    )
  })
})
