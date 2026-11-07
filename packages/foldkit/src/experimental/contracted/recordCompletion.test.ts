import { Effect, Exit, Layer, Option, Schema } from 'effect'
import { vi } from 'vitest'

import { describe, expect, it } from '@effect/vitest'

import * as Block from '../../block/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../message/index.js'
import {
  descriptorConstructorOf,
  registerDescriptorConstructor,
  registerProvidedExecutableResolver,
} from '../constructed/symbolic.js'
import * as Story from '../layered/testing/story.js'
import { withBlock } from '../layered/testing/withBlock.js'

const buildLayer = <Output, Error>(layer: Layer.Layer<Output, Error>) =>
  Effect.runPromise(Layer.build(layer).pipe(Effect.scoped))

const makeChildGraph = (isSecondAcquisitionFailure = false) => {
  const acquisitions: Array<string> = []
  const initializations: Array<string> = []
  const acquiredFirst = vi.fn()
  const releasedFirst = vi.fn()
  const acquiredSecond = vi.fn()
  const releasedSecond = vi.fn()
  const builtHandler = vi.fn()
  const ranHandler = vi.fn()
  const builtParentEffects = vi.fn()

  const FirstMessage = defineMessageUnion({ CompletedRead: {} })
  const FirstKey = Symbol('RecordCompletionFirst')
  const First = Block.make('RecordCompletionFirst', {
    key: FirstKey,
    Model: Schema.Struct({ value: Schema.Number }),
    Message: FirstMessage,
    InitArgs: Schema.Tuple([]),
  })
  const Read = First.makeCommand('Read', {
    messages: [FirstMessage.CompletedRead],
    handler: function* () {
      builtHandler()

      return () =>
        Effect.sync(() => {
          ranHandler()
          return FirstMessage.CompletedRead()
        })
    },
  })
  const FirstComposition = First.makeComposition()
  const firstLayer = First.makeLayer(
    Effect.acquireRelease(
      Effect.sync(() => {
        acquiredFirst()

        return {
          children: [],
          init: FirstComposition.makeInit(() => {
            initializations.push('First')
            return { model: { value: 1 }, commands: [Read()] }
          }),
          update: FirstComposition.makeUpdate({
            CompletedRead: model => ({ model }),
          }),
          EffectsLayer: Read.layer,
        }
      }),
      () => Effect.sync(releasedFirst),
    ),
  )

  const SecondKey = Symbol('RecordCompletionSecond')
  const Second = Block.make('RecordCompletionSecond', {
    key: SecondKey,
    Model: Schema.Struct({ value: Schema.Number }),
    Message: Schema.Never,
    isMessageFree: true,
    InitArgs: Schema.Tuple([]),
  })
  const SecondComposition = Second.makeComposition()
  const secondLayer = Second.makeLayer(
    Effect.acquireRelease(
      Effect.sync(() => {
        acquiredSecond()

        return {
          children: [],
          init: SecondComposition.makeInit(() => {
            initializations.push('Second')
            return { model: { value: 2 } }
          }),
          update: SecondComposition.makeUpdate({}),
        }
      }),
      () => Effect.sync(releasedSecond),
    ),
  )

  const constructFirst = descriptorConstructorOf(First)
  const constructSecond = descriptorConstructorOf(Second)
  if (constructFirst === undefined || constructSecond === undefined) {
    throw new Error('Expected original child construction recipes')
  }

  registerDescriptorConstructor(First, () =>
    Effect.sync(() => acquisitions.push('First')).pipe(
      Effect.flatMap(() => constructFirst()),
    ),
  )
  registerDescriptorConstructor(Second, () =>
    Effect.sync(() => acquisitions.push('Second')).pipe(
      Effect.flatMap(() =>
        isSecondAcquisitionFailure
          ? Effect.fail('Second acquisition failed')
          : constructSecond(),
      ),
    ),
  )
  registerProvidedExecutableResolver(First, () => Effect.succeed(Option.none()))
  registerProvidedExecutableResolver(Second, () =>
    Effect.succeed(Option.none()),
  )

  const ParentKey = Symbol('RecordCompletionParent')
  const Parent = Block.make('RecordCompletionParent', {
    key: ParentKey,
    Model: Schema.Struct({
      first: First.Model,
      second: Second.Model,
      repeatedFirst: First.Model,
    }),
    Message: Schema.Never,
    InitArgs: Schema.Tuple([]),
  })
  const FirstBinding = Parent.makeRequiredFieldBinding(First, {
    field: 'first',
  })
  const SecondBinding = Parent.makeRequiredFieldBinding(Second, {
    field: 'second',
  })
  const RepeatedFirstBinding = Parent.makeRequiredFieldBinding(First, {
    field: 'repeatedFirst',
  })
  const ParentComposition = Parent.makeComposition({
    bindings: [FirstBinding, SecondBinding, RepeatedFirstBinding],
  })
  const init = ParentComposition.makeInit(() => ({ model: {} }))
  const update = ParentComposition.makeUpdate({})
  const parentLayer = Parent.makeLayer({
    init,
    update,
    EffectsLayer: Layer.effectDiscard(Effect.sync(builtParentEffects)),
  }).pipe(Layer.provide(Layer.merge(firstLayer, secondLayer)))

  return {
    Parent,
    parentLayer,
    firstLayer,
    secondLayer,
    init,
    update,
    acquisitions,
    initializations,
    acquiredFirst,
    releasedFirst,
    acquiredSecond,
    releasedSecond,
    builtHandler,
    ranHandler,
    builtParentEffects,
  }
}

describe('record Block completion', () => {
  it.effect('snapshots portable plans once without running init', () =>
    Effect.gen(function* () {
      const Key = Symbol('RecordCompletionSnapshot')
      const Snapshot = Block.make('RecordCompletionSnapshot', {
        key: Key,
        Model: Schema.Number,
        Message: Schema.Never,
        isMessageFree: true,
        InitArgs: Schema.Tuple([]),
      })
      const FirstComposition = Snapshot.makeComposition()
      const SecondComposition = Snapshot.makeComposition()
      const initialized = vi.fn()
      const firstInit = FirstComposition.makeInit(() => {
        initialized()
        return { model: 1 }
      })
      const secondInit = SecondComposition.makeInit(() => ({ model: 2 }))
      const reads = { count: 0 }
      const body = {
        get init() {
          reads.count += 1
          return reads.count === 1 ? firstInit : secondInit
        },
        update: FirstComposition.makeUpdate({}),
      }
      const layer = Snapshot.makeLayer(body)

      expect(reads.count).toBe(1)
      expect(initialized).not.toHaveBeenCalled()
      Reflect.set(body, 'update', SecondComposition.makeUpdate({}))

      yield* Story.story(
        { block: Snapshot, layer },
        Story.init(),
        Story.model(model => expect(model).toBe(1)),
      )

      expect(reads.count).toBe(1)
      expect(initialized).toHaveBeenCalledOnce()
    }),
  )

  it.each(['children', 'bindings', 'operations'])(
    'rejects an explicitly undefined or non-enumerable %s field',
    field => {
      const Key = Symbol('RecordCompletionForbiddenField')
      const ForbiddenField = Block.make('RecordCompletionForbiddenField', {
        key: Key,
        Model: Schema.Number,
        Message: Schema.Never,
        isMessageFree: true,
        InitArgs: Schema.Tuple([]),
      })
      const Composition = ForbiddenField.makeComposition()
      const body = {
        init: Composition.makeInit(() => ({ model: 0 })),
        update: Composition.makeUpdate({}),
      }

      expect(() =>
        Reflect.apply(ForbiddenField.makeLayer, undefined, [
          { ...body, [field]: undefined },
        ]),
      ).toThrow(`cannot declare "${field}"`)
      expect(() =>
        Reflect.apply(ForbiddenField.makeLayer, undefined, [
          Object.defineProperty({ ...body }, field, { value: [] }),
        ]),
      ).toThrow(`cannot declare "${field}"`)
    },
  )

  it('rejects another Block even when its Schemas match', async () => {
    const FirstKey = Symbol('RecordCompletionOriginal')
    const First = Block.make('RecordCompletionOriginal', {
      key: FirstKey,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const SecondKey = Symbol('RecordCompletionForeign')
    const Second = Block.make('RecordCompletionForeign', {
      key: SecondKey,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const ForeignComposition = Second.makeComposition()
    const layer = Reflect.apply(First.makeLayer, undefined, [
      {
        init: ForeignComposition.makeInit(() => ({ model: 0 })),
        update: ForeignComposition.makeUpdate({}),
      },
    ])

    await expect(buildLayer(layer)).rejects.toThrow(
      'Constructor plans belong to another Definition',
    )
  })

  it.each(['update', 'view', 'inMessageUpdate'])(
    'rejects a crossed %s from a separate same-shaped Composition',
    async field => {
      const InMessage = defineInMessageUnion({ RequestedReset: {} })
      const Key = Symbol('RecordCompletionCrossedPlan')
      const CrossedPlan = Block.make('RecordCompletionCrossedPlan', {
        key: Key,
        Model: Schema.Number,
        Message: Schema.Never,
        InMessage,
        InitArgs: Schema.Tuple([]),
        view: { kind: 'Element' },
      })
      const FirstComposition = CrossedPlan.makeComposition()
      const SecondComposition = CrossedPlan.makeComposition()
      const first = {
        init: FirstComposition.makeInit(() => ({ model: 0 })),
        update: FirstComposition.makeUpdate({}),
        view: FirstComposition.makeView((_model, h) => h.div([])),
        inMessageUpdate: FirstComposition.makeInMessageUpdate({
          RequestedReset: () => ({ model: 0 }),
        }),
      }
      const second = {
        update: SecondComposition.makeUpdate({}),
        view: SecondComposition.makeView((_model, h) => h.div([])),
        inMessageUpdate: SecondComposition.makeInMessageUpdate({
          RequestedReset: () => ({ model: 0 }),
        }),
      }
      const layer = Reflect.apply(CrossedPlan.makeLayer, undefined, [
        { ...first, [field]: Reflect.get(second, field) },
      ])

      await expect(buildLayer(layer)).rejects.toThrow(
        'A hybrid plan belongs to another static Composition',
      )
    },
  )

  it.effect(
    'acquires in Binding order, shares child Layers and defers init and handlers',
    () =>
      Effect.gen(function* () {
        const graph = makeChildGraph()

        expect(graph.acquisitions).toEqual([])
        expect(graph.initializations).toEqual([])
        expect(graph.acquiredFirst).not.toHaveBeenCalled()
        expect(graph.acquiredSecond).not.toHaveBeenCalled()

        yield* withBlock(
          { block: graph.Parent, layer: graph.parentLayer },
          executable => {
            expect(graph.acquisitions).toEqual(['First', 'Second', 'First'])
            expect(graph.acquiredFirst).toHaveBeenCalledOnce()
            expect(graph.acquiredSecond).toHaveBeenCalledOnce()
            expect(graph.initializations).toEqual([])
            expect(graph.releasedFirst).not.toHaveBeenCalled()
            expect(graph.releasedSecond).not.toHaveBeenCalled()

            const init = executable.init()

            expect(init.model).toEqual({
              first: { value: 1 },
              second: { value: 2 },
              repeatedFirst: { value: 1 },
            })
            expect(graph.initializations).toEqual(['First', 'Second', 'First'])
            expect(init.commands).toHaveLength(2)
            expect(graph.builtHandler).not.toHaveBeenCalled()
            expect(graph.ranHandler).not.toHaveBeenCalled()
            expect(graph.builtParentEffects).not.toHaveBeenCalled()
          },
        )

        expect(graph.releasedFirst).toHaveBeenCalledOnce()
        expect(graph.releasedSecond).toHaveBeenCalledOnce()
      }),
  )

  it.effect('releases child construction when a later acquisition fails', () =>
    Effect.gen(function* () {
      const graph = makeChildGraph(true)
      const construction = yield* Layer.build(graph.parentLayer).pipe(
        Effect.scoped,
        Effect.exit,
      )

      expect(Exit.isFailure(construction)).toBe(true)
      expect(graph.acquisitions).toEqual(['First', 'Second'])
      expect(graph.releasedFirst).toHaveBeenCalledOnce()
      expect(graph.releasedSecond).toHaveBeenCalledOnce()
      expect(graph.initializations).toEqual([])
      expect(graph.builtHandler).not.toHaveBeenCalled()
      expect(graph.ranHandler).not.toHaveBeenCalled()
    }),
  )

  it.effect(
    'defers child arguments to each parent init and runs Steps after child assembly',
    () =>
      Effect.gen(function* () {
        const selectedArguments = vi.fn()
        const initializedChild = vi.fn()
        const steppedCounts: Array<number> = []
        const ChildMessage = defineMessageUnion({ CompletedRememberCount: {} })
        const ChildKey = Symbol('RecordCompletionDeferredChild')
        const Child = Block.make('RecordCompletionDeferredChild', {
          key: ChildKey,
          Model: Schema.Number,
          Message: ChildMessage,
          InitArgs: Schema.Tuple([Schema.Number]),
        })
        const RememberCount = Child.makeCommand('RememberCount', {
          args: { count: Schema.Number },
          messages: [ChildMessage.CompletedRememberCount],
          handler: function* () {
            return () => Effect.succeed(ChildMessage.CompletedRememberCount())
          },
        })
        const ChildComposition = Child.makeComposition()
        const childLayer = Child.makeLayer({
          init: ChildComposition.makeInit(count => {
            initializedChild(count)
            return { model: count, commands: [RememberCount({ count })] }
          }),
          update: ChildComposition.makeUpdate({
            CompletedRememberCount: model => ({ model }),
          }),
          EffectsLayer: RememberCount.layer,
        })
        const ParentMessage = defineMessageUnion({
          CompletedRememberAfterChild: {},
        })
        const ParentKey = Symbol('RecordCompletionDeferredParent')
        const Parent = Block.make('RecordCompletionDeferredParent', {
          key: ParentKey,
          Model: Schema.Struct({ child: Child.Model }),
          Message: ParentMessage,
          InitArgs: Schema.Tuple([Schema.Number]),
          ChildInitContext: Schema.Struct({ count: Schema.Number }),
        })
        const RememberAfterChild = Parent.makeCommand('RememberAfterChild', {
          args: { observedCount: Schema.Number },
          messages: [ParentMessage.CompletedRememberAfterChild],
          handler: function* () {
            return () =>
              Effect.succeed(ParentMessage.CompletedRememberAfterChild())
          },
        })
        const ChildBinding = Parent.makeRequiredFieldBinding(Child, {
          field: 'child',
          init: {
            contextToArgs: context => {
              selectedArguments(context)
              return [context.count]
            },
          },
        })
        const ParentComposition = Parent.makeComposition({
          bindings: [ChildBinding],
        })
        const rememberAssembledChild = Parent.makeStep(model => {
          steppedCounts.push(model.child)
          return {
            model,
            commands: [RememberAfterChild({ observedCount: model.child })],
          }
        })
        const parentLayer = Parent.makeLayer({
          init: ParentComposition.makeInit(count => ({
            childInitContext: { count: count + 10 },
            model: {},
            steps: [rememberAssembledChild],
          })),
          update: ParentComposition.makeUpdate({
            CompletedRememberAfterChild: model => ({ model }),
          }),
          EffectsLayer: RememberAfterChild.layer,
        }).pipe(Layer.provide(childLayer))

        expect(selectedArguments).not.toHaveBeenCalled()
        expect(initializedChild).not.toHaveBeenCalled()
        expect(steppedCounts).toEqual([])

        yield* withBlock({ block: Parent, layer: parentLayer }, executable => {
          expect(selectedArguments).not.toHaveBeenCalled()
          expect(initializedChild).not.toHaveBeenCalled()
          expect(steppedCounts).toEqual([])

          const firstInit = executable.init(4)
          const secondInit = executable.init(9)

          expect(firstInit.model).toEqual({ child: 14 })
          expect(secondInit.model).toEqual({ child: 19 })
          expect(selectedArguments.mock.calls).toEqual([
            [{ count: 14 }],
            [{ count: 19 }],
          ])
          expect(initializedChild.mock.calls).toEqual([[14], [19]])
          expect(steppedCounts).toEqual([14, 19])
          expect(firstInit.commands).toMatchObject([
            { name: 'child/RememberCount', args: { count: 14 } },
            { name: RememberAfterChild.name, args: { observedCount: 14 } },
          ])
          expect(secondInit.commands).toMatchObject([
            { name: 'child/RememberCount', args: { count: 19 } },
            { name: RememberAfterChild.name, args: { observedCount: 19 } },
          ])
        })
      }),
  )

  it.effect(
    'shares children within each acquisition and releases separate scopes',
    () =>
      Effect.gen(function* () {
        const acquisitions: Array<number> = []
        const releases: Array<number> = []
        const ChildKey = Symbol('RecordCompletionScopedChild')
        const Child = Block.make('RecordCompletionScopedChild', {
          key: ChildKey,
          Model: Schema.Number,
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const ChildComposition = Child.makeComposition()
        const childLayer = Child.makeLayer(
          Effect.gen(function* () {
            const value = yield* Effect.acquireRelease(
              Effect.sync(() => {
                const value = acquisitions.length + 1
                acquisitions.push(value)
                return value
              }),
              value => Effect.sync(() => releases.push(value)),
            )

            return {
              children: [],
              init: ChildComposition.makeInit(() => ({ model: value })),
              update: ChildComposition.makeUpdate({}),
            }
          }),
        )
        const ParentKey = Symbol('RecordCompletionScopedParent')
        const Parent = Block.make('RecordCompletionScopedParent', {
          key: ParentKey,
          Model: Schema.Struct({ first: Child.Model, second: Child.Model }),
          Message: Schema.Never,
          isMessageFree: true,
          InitArgs: Schema.Tuple([]),
        })
        const FirstBinding = Parent.makeRequiredFieldBinding(Child, {
          field: 'first',
        })
        const SecondBinding = Parent.makeRequiredFieldBinding(Child, {
          field: 'second',
        })
        const ParentComposition = Parent.makeComposition({
          bindings: [FirstBinding, SecondBinding],
        })
        const parentLayer = Parent.makeLayer({
          init: ParentComposition.makeInit(() => ({ model: {} })),
          update: ParentComposition.makeUpdate({}),
        }).pipe(Layer.provide(childLayer))

        yield* withBlock({ block: Parent, layer: parentLayer }, executable => {
          const init_ = executable.init()

          expect(init_.model).toEqual({ first: 1, second: 1 })
          expect(acquisitions).toEqual([1])
          expect(releases).toEqual([])
        })
        expect(releases).toEqual([1])

        yield* withBlock({ block: Parent, layer: parentLayer }, executable => {
          const init_ = executable.init()

          expect(init_.model).toEqual({ first: 2, second: 2 })
          expect(acquisitions).toEqual([1, 2])
          expect(releases).toEqual([1])
        })
        expect(releases).toEqual([1, 2])
      }),
  )

  it('retains original host-handler readiness without constructing handlers', async () => {
    const Message = defineMessageUnion({ CompletedRead: {} })
    const Key = Symbol('RecordCompletionHost')
    const Host = Block.make('RecordCompletionHost', {
      key: Key,
      Model: Schema.Number,
      Message,
      InitArgs: Schema.Tuple([]),
    })
    const Read = Host.makeCommand('Read', {
      messages: [Message.CompletedRead],
    })
    const Composition = Host.makeComposition()
    const pendingLayer = Host.makeLayer({
      init: Composition.makeInit(() => ({
        model: 0,
        commands: [Read()],
      })),
      update: Composition.makeUpdate({ CompletedRead: model => ({ model }) }),
      hostHandlers: [Read],
    })
    const builtHandler = vi.fn()
    const selectedLayer = Host.provideHandlers(
      Read.toLayer(
        Effect.sync(() => {
          builtHandler()
          return () => Effect.succeed(Message.CompletedRead())
        }),
      ),
    )(pendingLayer)

    await expect(buildLayer(pendingLayer)).rejects.toThrow(
      'resolve its original host handlers',
    )
    await Effect.runPromise(
      withBlock({ block: Host, layer: selectedLayer }, executable => {
        const init_ = executable.init()

        expect(init_.model).toBe(0)
        expect(init_.commands).toHaveLength(1)
      }),
    )
    expect(builtHandler).not.toHaveBeenCalled()
  })

  it('rejects a structurally narrowed Effect record before its constructor runs', () => {
    const Key = Symbol('RecordCompletionHybrid')
    const Hybrid = Block.make('RecordCompletionHybrid', {
      key: Key,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const Composition = Hybrid.makeComposition()
    const init = Composition.makeInit(() => ({ model: 0 }))
    const update = Composition.makeUpdate({})
    const built = vi.fn()
    const constructor = Effect.sync(() => {
      built()
      return { children: [], init, update }
    })
    const record: { init: typeof init; update: typeof update } = Object.assign(
      constructor,
      { init, update },
    )

    expect(() => {
      Hybrid.makeLayer(record)
    }).toThrow('must return its implementation fields')
    expect(built).not.toHaveBeenCalled()

    const inheritedRecord: { init: typeof init; update: typeof update } =
      Object.create(record)

    expect(Object.hasOwn(inheritedRecord, 'init')).toBe(false)
    expect(Object.hasOwn(inheritedRecord, 'update')).toBe(false)
    expect(() => {
      Hybrid.makeLayer(inheritedRecord)
    }).toThrow('must return its implementation fields')
    expect(built).not.toHaveBeenCalled()
  })

  it.effect('preserves unrelated custom constructor metadata', () => {
    const Key = Symbol('RecordCompletionConstructorMetadata')
    const Metadata = Block.make('RecordCompletionConstructorMetadata', {
      key: Key,
      Model: Schema.Number,
      Message: Schema.Never,
      isMessageFree: true,
      InitArgs: Schema.Tuple([]),
    })
    const Composition = Metadata.makeComposition()
    const init = Composition.makeInit(() => ({ model: 0 }))
    const update = Composition.makeUpdate({})
    const constructor = Object.assign(
      Effect.succeed({ children: [], init, update }),
      {
        children: ['diagnostic child'],
      },
    )
    const layer = Metadata.makeLayer(constructor)

    return Story.story(
      { block: Metadata, layer },
      Story.init(),
      Story.model(model => expect(model).toBe(0)),
    )
  })

  it('keeps custom Effect constructors responsible for their own children', async () => {
    const graph = makeChildGraph()
    const layer = Reflect.apply(graph.Parent.makeLayer, undefined, [
      Effect.succeed({ children: [], init: graph.init, update: graph.update }),
    ])

    await expect(
      buildLayer(
        Layer.provide(layer, Layer.merge(graph.firstLayer, graph.secondLayer)),
      ),
    ).rejects.toThrow('missing a registered Binding connection')
    expect(graph.acquisitions).toEqual([])
    expect(graph.initializations).toEqual([])
    expect(graph.releasedFirst).toHaveBeenCalledOnce()
    expect(graph.releasedSecond).toHaveBeenCalledOnce()
  })
})
