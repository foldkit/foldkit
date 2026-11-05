import {
  Array,
  Cause,
  Context,
  Effect,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
} from 'effect'
import { describe, expect, test, vi } from 'vitest'

import {
  type ActiveInstance,
  CurrentInstance,
} from '../block/instanceContext.js'
import * as Block from '../block/public.js'
import { qualifyLayer } from '../block/scope.js'
import { defineMessageUnion } from '../message/public.js'
import * as CompositionRuntime from '../runtime/compositionRuntime.js'
import * as Scene from '../scene/public.js'
import { modifyFields } from '../struct/public.js'
import * as Application from './apps/retainedMountDelivery/application.js'
import * as Surface from './apps/retainedMountDelivery/surface.js'
import { makeSceneHost } from './sceneHost.js'
import { sceneGraphOf } from './testGraph.js'

const subject = {
  block: Application.ApplicationBlock,
  layer: Application.layer,
}

const requireNode = (context: Context.Context<never>): ActiveInstance => {
  const cursor = Context.get(context, CurrentInstance)
  if (cursor === undefined) throw new Error('Missing occurrence context')
  return cursor.node
}

describe('Scene occurrence host', () => {
  test('keeps the same node for the same Model and permanently retires a reused key', async () => {
    let original: ActiveInstance | undefined
    let replacement: ActiveInstance | undefined
    await Effect.runPromise(
      Scene.withBlock(subject, block =>
        Effect.gen(function* () {
          const graph = sceneGraphOf(block)
          if (graph === undefined) throw new Error('Missing completed graph')
          expect(Object.is(graph, block)).toBe(false)
          const host = makeSceneHost(
            graph,
            yield* Effect.context<Scope.Scope>(),
          )
          expect('start' in host).toBe(false)
          host.synchronize(Application.initialModel)
          const root = requireNode(host.context)
          expect(Reflect.get(root, 'isStarted')).toBe(false)
          original = [...root.children.values()][0]?.get('first')
          expect(original).toBeDefined()
          host.synchronize(Application.initialModel)
          expect(
            [...root.children.values()][0]?.get('first') === original,
          ).toBe(true)
          host.synchronize(
            modifyFields(Application.initialModel, {
              surfaces: Array.filter(item => item.key !== 'first'),
            }),
          )
          expect(original?.isActive).toBe(false)
          host.synchronize(Application.initialModel)
          replacement = [...root.children.values()][0]?.get('first')
          expect(replacement === original).toBe(false)
          expect(replacement?.isActive).toBe(true)
        }),
      ),
    )
    expect(original?.isActive).toBe(false)
    expect(replacement?.isActive).toBe(false)
  })

  test('closes actual occurrence scopes after a thrown public Scene step and separates runs', async () => {
    const roots: Array<ActiveInstance> = []
    const scopes: Array<Scope.Scope> = []
    const finalized: Array<number> = []
    const makeRuntime = CompositionRuntime.makeCompositionRuntime
    const instrument = vi
      .spyOn(CompositionRuntime, 'makeCompositionRuntime')
      .mockImplementation(config =>
        makeRuntime(config).pipe(
          Effect.tap(runtime =>
            Effect.gen(function* () {
              const root = requireNode(runtime.context)
              roots.push(root)
              const nodes = [
                root,
                ...Array.flatMap([...root.children.values()], children => [
                  ...children.values(),
                ]),
              ]
              for (const node of nodes) {
                const scope: Scope.Scope = Reflect.get(node, 'scope')
                scopes.push(scope)
                const index = scopes.length
                yield* Scope.addFinalizer(
                  scope,
                  Effect.promise(async () => {
                    await Promise.resolve()
                    finalized.push(index)
                  }),
                )
              }
            }),
          ),
        ),
      )
    try {
      const run = () =>
        Scene.scene(
          { ...subject, viewInputs: { form: 'nested' } },
          Scene.init(false),
          Scene.Mount.resolve(
            Surface.ObserveSurface({ label: 'first' }),
            Surface.Message.MeasuredSurface({ width: 100 }),
          ),
          Scene.tap(() => {
            throw new Error('thrown step')
          }),
        )
      await expect(Effect.runPromise(run())).rejects.toThrow('thrown step')
      await expect(Effect.runPromise(run())).rejects.toThrow('thrown step')
      expect(roots).toHaveLength(2)
      expect(roots[0] === roots[1]).toBe(false)
      expect(roots.every(root => !root.isActive)).toBe(true)
      expect(scopes).toHaveLength(6)
      expect(scopes.every(scope => scope.state._tag === 'Closed')).toBe(true)
      expect(finalized.sort()).toEqual([1, 2, 3, 4, 5, 6])
    } finally {
      instrument.mockRestore()
    }
  })

  test('starts real Subscription handlers only in the separate started Runtime control', async () => {
    const log: Array<string> = []
    const Model = Schema.Struct({ label: Schema.String })
    type Model = typeof Model.Type
    const Message = defineMessageUnion({ ReceivedPulse: {} })
    type Message = typeof Message.Type
    const Definition = Block.makeDefinition('SceneStartControl', {
      Model,
      Message,
    })
    const subscriptions = Definition.makeSubscriptions(entry => ({
      pulses: entry(
        'Pulses',
        { label: Schema.String },
        {
          messages: [Message.ReceivedPulse],
          modelToDependencies: model => ({ label: model.label }),
          handler: function* () {
            return ({ label }) =>
              Stream.callback<never>(() =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    log.push(`started ${label}`)
                  }),
                  () =>
                    Effect.sync(() => {
                      log.push(`stopped ${label}`)
                    }),
                ).pipe(Effect.andThen(Effect.never)),
              )
          },
        },
      ),
    }))
    const Composition = Definition.makeComposition()
    const prepare = () =>
      Composition.prepareBlock({
        init: () => ({ model: Model.make({ label: 'control' }) }),
        update: Composition.makeUpdate({ ReceivedPulse: model => ({ model }) }),
        subscriptions,
        EffectsLayer: subscriptions.layer,
      })
    const block: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof Model,
      typeof prepare
    > = Block.assemble(prepare)
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const scope = yield* Scope.Scope
          const handlers = yield* Layer.build(
            qualifyLayer(block.owner.id, block.EffectsLayer),
          )
          const context = Context.merge(
            yield* Effect.context<Scope.Scope>(),
            handlers,
          )
          const host = makeSceneHost(block, context)
          host.synchronize(block.init().model)
          expect(log).toEqual([])
          const failures: Array<string> = []
          const runtime = yield* CompositionRuntime.makeCompositionRuntime<
            unknown,
            unknown
          >({
            block,
            initModel: block.init().model,
            context,
            runtimeScope: scope,
            enqueueMessage: () => {},
            crashWith: cause =>
              Effect.sync(() => {
                failures.push(Cause.pretty(cause))
              }),
            maybeSlowSubscriptionDependencies: Option.none(),
          })
          expect(log).toEqual([])
          yield* runtime.start
          yield* Effect.repeat(Effect.yieldNow, {
            until: () => log.length > 0 || failures.length > 0,
          }).pipe(Effect.timeout('2 seconds'))
          expect(failures).toEqual([])
          expect(log).toEqual(['started control'])
        }),
      ),
    )
    expect(log).toEqual(['started control', 'stopped control'])
  })
})
