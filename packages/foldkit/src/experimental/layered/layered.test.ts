import {
  Array,
  Data,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Schema,
  Scope,
  Stream,
} from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Program from '../../runtime/programPublic.js'
import { __startProgram } from '../../runtime/start.js'
import { modifyFields } from '../../struct/index.js'
import { acquisitionOf } from '../constructed/symbolic.js'
import { type CoreContract, fromBlock, makeDefinition } from './public.js'

class ConstructorFailure extends Data.TaggedError('ConstructorFailure')<{}> {}

const ownedScope = Effect.acquireRelease(Scope.make(), scope =>
  Scope.close(scope, Exit.void),
)

const track = (events: Array<string>, acquired: string, released: string) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      events.push(acquired)
    }),
    () =>
      Effect.sync(() => {
        events.push(released)
      }),
  )

const makeFixture = (
  events: Array<string>,
  afterFirst: Effect.Effect<void, ConstructorFailure> = Effect.void,
) => {
  let nextImplementationId = 0

  const ChildMessage = defineMessageUnion({
    RequestedRead: {},
    CompletedRead: { value: Schema.Number },
  })
  const ChildOutMessage = defineMessageUnion({
    Read: { value: Schema.Number },
  })
  const ChildModel = Schema.Struct({ value: Schema.Number })
  const ChildDefinition = makeDefinition('LayeredScopeChild', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  })
  const Read = ChildDefinition.makeCommand('Read', {
    args: { value: Schema.Number },
    messages: [ChildMessage.CompletedRead],
    handler: function* () {
      yield* track(events, 'Handler acquired', 'Handler released')

      return ({ value }) =>
        Effect.succeed(ChildMessage.CompletedRead({ value }))
    },
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childInit = ChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 0 }),
  }))
  const childUpdate = ChildComposition.makeUpdate({
    RequestedRead: ChildDefinition.makeCommandsStep(model => [
      Read({ value: model.value + 1 }),
    ]),
    CompletedRead: (model, { value }) => ({
      model: modifyFields(model, { value: () => value }),
      outMessage: ChildOutMessage.Read({ value }),
    }),
  })
  const ChildBlock = ChildDefinition.makeBlock(
    Effect.gen(function* () {
      const implementationId = yield* Effect.sync(() => {
        nextImplementationId += 1

        return nextImplementationId
      })

      yield* track(
        events,
        `Implementation acquired ${implementationId}`,
        `Implementation released ${implementationId}`,
      )

      return {
        children: [],
        init: childInit,
        update: childUpdate,
        operations: { requestRead: ChildMessage.RequestedRead },
        EffectsLayer: Read.layer,
      }
    }),
  )
  const Message = defineMessageUnion({
    RequestedReadFirst: {},
    RequestedReadSecond: {},
  })
  const Model = Schema.Struct({
    first: ChildBlock.Model,
    second: ChildBlock.Model,
    received: Schema.Array(Schema.Number),
  })
  const Definition = makeDefinition('LayeredScopeParent', {
    Model,
    Message,
  })
  const foldRead = Definition.makeOutMessageFold(ChildBlock, {
    Read: ({ value }) =>
      Definition.makeFieldsStep(() => ({ received: Array.append(value) })),
  })
  const FirstBinding = Definition.makeRequiredFieldBinding(ChildBlock, {
    field: 'first',
    init: { contextToArgs: () => [] },
  }).withOutMessagePolicy({ fold: foldRead })
  const SecondBinding = Definition.makeRequiredFieldBinding(ChildBlock, {
    field: 'second',
    init: { contextToArgs: () => [] },
  })
    .withOutMessagePolicy({ fold: foldRead })
    .withOutMessagePolicy({ fold: foldRead })
  const Composition = Definition.makeComposition({
    bindings: [FirstBinding, SecondBinding],
  })
  const init = Composition.makeInit(() => ({ model: { received: [] } }))
  const update = Composition.makeUpdate({
    RequestedReadFirst: FirstBinding.requestRead(),
    RequestedReadSecond: SecondBinding.requestRead(),
  })
  const ParentBlock = Definition.makeBlock(
    Effect.gen(function* () {
      const first = yield* FirstBinding

      yield* afterFirst

      const second = yield* SecondBinding

      return {
        children: [first, second],
        init,
        update,
      }
    }),
  )

  return { ParentBlock, ChildBlock, Message }
}

const makeLifecycleFixture = (events: Array<string>) => {
  const Model = Schema.Struct({ id: Schema.String })
  const Message = defineMessageUnion({
    AcquiredSession: {},
    ReleasedSession: {},
    FailedAcquireSession: {},
    CompletedObservePanel: {},
  })
  const Definition = Block.makeDefinition('LayeredLifecycleChild', {
    Model,
    Message,
  })
  const Session = Definition.makeResource<string>()('Session')
  const subscriptions = Definition.makeSubscriptions(entry => ({
    activity: entry('ObserveActivity', {
      messages: [],
      handler: function* () {
        yield* track(
          events,
          'Subscription handler acquired',
          'Subscription handler released',
        )

        return () =>
          Stream.fromEffect(
            Effect.sync(() => {
              events.push('Subscription started')
            }),
          ).pipe(
            Stream.flatMap(() => Stream.never),
            Stream.ensuring(
              Session.get.pipe(
                Effect.orDie,
                Effect.andThen(
                  Effect.sync(() => {
                    events.push('Subscription stopped')
                  }),
                ),
              ),
            ),
          )
      },
    }),
  }))
  const managedResources = Definition.makeManagedResources(entry => ({
    session: entry('ManageSession', Schema.Option(Schema.Null), {
      resource: Session,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => Message.AcquiredSession(),
      onReleased: () => Message.ReleasedSession(),
      onAcquireError: () => Message.FailedAcquireSession(),
      handler: function* () {
        yield* track(
          events,
          'ManagedResource handler acquired',
          'ManagedResource handler released',
        )

        return {
          acquire: () =>
            Effect.sync(() => {
              events.push('ManagedResource acquired')

              return 'session'
            }),
          release: () =>
            Effect.sync(() => {
              events.push('ManagedResource released')
            }),
        }
      },
    }),
  }))
  const ObservePanel = Definition.makeMount('ObservePanel', {
    messages: [Message.CompletedObservePanel],
    handler: function* () {
      yield* track(events, 'Mount handler acquired', 'Mount handler released')

      return () =>
        track(events, 'Mount acquired', 'Mount released').pipe(
          Effect.as(Message.CompletedObservePanel()),
        )
    },
  })
  const Composition = Definition.makeComposition({ mounts: [ObservePanel] })
  const childPrepare = () =>
    Composition.prepareBlock({
      init: () => ({ model: Model.make({ id: 'one' }) }),
      update: Composition.makeUpdate({
        AcquiredSession: Definition.makeNoopStep(),
        ReleasedSession: Definition.makeNoopStep(),
        FailedAcquireSession: Definition.makeNoopStep(),
        CompletedObservePanel: Definition.makeNoopStep(),
      }),
      view: Composition.makeView((model, h) =>
        h.div([h.OnMount(ObservePanel())], [`child:${model.id}`]),
      ),
      subscriptions,
      managedResources,
      EffectsLayer: Layer.mergeAll(
        subscriptions.layer,
        managedResources.layer,
        ObservePanel.layer,
      ),
    })
  const ChildBlock: Block.FromAssemblyWithView<
    typeof Model,
    typeof childPrepare
  > = Block.assemble(childPrepare)
  const ContainerModel = Schema.Struct({
    maybeChild: Schema.Option(ChildBlock.Model),
  })
  const ContainerMessage = defineMessageUnion({
    ClickedRemoveChild: {},
    ClickedRestoreChild: {},
  })
  const ContainerDefinition = Block.makeDefinition(
    'LayeredLifecycleContainer',
    {
      Model: ContainerModel,
      Message: ContainerMessage,
    },
  )
  const ChildBinding = ContainerDefinition.makeOptionalFieldBinding(
    ChildBlock,
    {
      field: 'maybeChild',
    },
  )
  const ContainerComposition = ContainerDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const containerPrepare = () =>
    ContainerComposition.prepareBlock({
      init: () => ({
        model: ContainerModel.make({
          maybeChild: Option.some(ChildBlock.init().model),
        }),
      }),
      update: ContainerComposition.makeUpdate({
        ClickedRemoveChild: ContainerDefinition.makeFieldsStep(() => ({
          maybeChild: () => Option.none(),
        })),
        ClickedRestoreChild: ContainerDefinition.makeFieldsStep(() => ({
          maybeChild: () => Option.some(ChildBlock.init().model),
        })),
      }),
      view: ContainerComposition.makeView((model, h) =>
        h.div(
          [],
          [
            h.button(
              [
                h.Id('remove-layered-child'),
                h.OnClick(ContainerMessage.ClickedRemoveChild()),
              ],
              ['Remove child'],
            ),
            h.button(
              [
                h.Id('restore-layered-child'),
                h.OnClick(ContainerMessage.ClickedRestoreChild()),
              ],
              ['Restore child'],
            ),
            Option.match(model.maybeChild, {
              onNone: () => h.p([], ['child removed']),
              onSome: child =>
                h.block(
                  ChildBinding.embedView({ slotId: 'child', model: child }),
                ),
            }),
          ],
        ),
      ),
    })
  const ContainerBlock: Block.FromAssemblyWithView<
    typeof ContainerModel,
    typeof containerPrepare
  > = Block.assemble(containerPrepare)
  const LifecycleBlock = fromBlock(ContainerBlock)
  const RootDefinition = makeDefinition('LayeredLifecycleRoot', {
    Model: Schema.Struct({ lifecycle: LifecycleBlock.Model }),
    Message: defineMessageUnion({}),
  })
  const LifecycleBinding = RootDefinition.makeRequiredFieldBinding(
    LifecycleBlock,
    {
      field: 'lifecycle',
      init: { contextToArgs: () => [] },
    },
  )
  const RootComposition = RootDefinition.makeComposition({
    bindings: [LifecycleBinding],
  })
  const ApplicationBlock = RootDefinition.makeBlock(
    Effect.gen(function* () {
      yield* track(events, 'Implementation acquired', 'Implementation released')

      const lifecycle = yield* LifecycleBinding

      return {
        children: [lifecycle],
        init: RootComposition.makeInit(() => ({ model: {} })),
        update: RootComposition.makeUpdate({}),
        view: RootComposition.makeView((model, h) =>
          h.block(
            LifecycleBinding.embedView({
              slotId: 'lifecycle',
              model: model.lifecycle,
            }),
          ),
        ),
      }
    }),
  )

  return ApplicationBlock
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Layer-owned Block construction', () => {
  it('shares one implementation while retaining independent Models and selected policies', async () => {
    const events: Array<string> = []
    const { ParentBlock, Message } = makeFixture(events)

    expect(events).toEqual([])
    expect(ParentBlock.layer).toBe(ParentBlock.layer)
    expect(Object.hasOwn(ParentBlock, 'construct')).toBe(false)

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const graphScope = yield* ownedScope
          const handlerScope = yield* ownedScope
          const graph = yield* Layer.build(ParentBlock.layer).pipe(
            Scope.provide(graphScope),
          )
          const block = yield* ParentBlock.get.pipe(Effect.provide(graph))
          const sameBlock = yield* ParentBlock.get.pipe(Effect.provide(graph))

          expect(block).toBe(sameBlock)
          expect(events).toEqual(['Implementation acquired 1'])

          const initial = block.init()
          const first = block.update(
            initial.model,
            Message.RequestedReadFirst(),
          )
          const firstRead = Option.getOrThrow(Array.head(first.commands ?? []))

          expect(events).toEqual(['Implementation acquired 1'])

          const handlers = yield* Layer.build(block.EffectsLayer).pipe(
            Scope.provide(handlerScope),
          )
          const firstMessage = yield* firstRead.effect.pipe(
            Effect.provide(handlers),
          )
          const firstCompleted = block.update(first.model, firstMessage)

          expect(firstCompleted.model.first.value).toBe(1)
          expect(firstCompleted.model.second.value).toBe(0)

          const second = block.update(
            firstCompleted.model,
            Message.RequestedReadSecond(),
          )
          const secondRead = Option.getOrThrow(
            Array.head(second.commands ?? []),
          )
          const secondMessage = yield* secondRead.effect.pipe(
            Effect.provide(handlers),
          )
          const secondCompleted = block.update(second.model, secondMessage)

          expect(secondCompleted.model.first.value).toBe(1)
          expect(secondCompleted.model.second.value).toBe(1)
          expect(secondCompleted.model.received).toEqual([1, 1])
          expect(events).toEqual([
            'Implementation acquired 1',
            'Handler acquired',
          ])

          yield* Scope.close(handlerScope, Exit.void)

          expect(events).toContain('Handler released')
          expect(events).not.toContain('Implementation released 1')

          yield* Scope.close(graphScope, Exit.void)

          expect(
            events.filter(event => event === 'Implementation released 1'),
          ).toHaveLength(1)
        }),
      ),
    )
  })

  it('cleans a failed Layer build before the still-open caller Scope exits', async () => {
    const events: Array<string> = []
    const failure = new ConstructorFailure()
    const { ParentBlock } = makeFixture(events, Effect.fail(failure))

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* track(events, 'Caller acquired', 'Caller released')

          const exit = yield* Layer.build(ParentBlock.layer).pipe(Effect.exit)

          expect(exit).toEqual(Exit.fail(failure))
          expect(events).toEqual([
            'Caller acquired',
            'Implementation acquired 1',
            'Implementation released 1',
          ])
        }),
      ),
    )

    expect(events).toEqual([
      'Caller acquired',
      'Implementation acquired 1',
      'Implementation released 1',
      'Caller released',
    ])
  })

  it('respects fresh subgraphs and keeps shared implementations until their last Scope closes', async () => {
    const events: Array<string> = []
    const { ParentBlock, ChildBlock } = makeFixture(events)

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const memoMap = yield* Layer.makeMemoMap
          const childScope = yield* ownedScope
          const firstScope = yield* ownedScope
          const secondScope = yield* ownedScope
          const freshScope = yield* ownedScope

          yield* Layer.buildWithMemoMap(ChildBlock.layer, memoMap, childScope)

          const firstContext = yield* Layer.buildWithMemoMap(
            ParentBlock.layer,
            memoMap,
            firstScope,
          )
          const secondContext = yield* Layer.buildWithMemoMap(
            ParentBlock.layer,
            memoMap,
            secondScope,
          )
          const freshContext = yield* Layer.buildWithMemoMap(
            Layer.fresh(ParentBlock.layer),
            memoMap,
            freshScope,
          )
          const first = yield* ParentBlock.get.pipe(
            Effect.provide(firstContext),
          )
          const second = yield* ParentBlock.get.pipe(
            Effect.provide(secondContext),
          )
          const fresh = yield* ParentBlock.get.pipe(
            Effect.provide(freshContext),
          )

          expect(first).toBe(second)
          expect(first).not.toBe(fresh)
          expect(events).toEqual([
            'Implementation acquired 1',
            'Implementation acquired 2',
          ])

          yield* Scope.close(childScope, Exit.void)
          yield* Scope.close(firstScope, Exit.void)

          expect(events).not.toContain('Implementation released 1')

          yield* Scope.close(secondScope, Exit.void)

          expect(events).toContain('Implementation released 1')
          expect(events).not.toContain('Implementation released 2')
          expect(fresh.init().model.first.value).toBe(0)

          yield* Scope.close(freshScope, Exit.void)

          expect(
            events.filter(event => event.startsWith('Implementation released')),
          ).toHaveLength(2)
        }),
      ),
    )
  })

  it('preserves Model-owned occurrence lifetimes through the existing internal Runtime bridge', async () => {
    const events: Array<string> = []
    const ApplicationBlock = makeLifecycleFixture(events)
    const graphScope = Scope.makeUnsafe()
    const container = document.createElement('div')
    container.id = 'layered-lifecycle-test'
    document.body.appendChild(container)

    try {
      const graph = await Effect.runPromise(
        Layer.buildWithMemoMap(
          ApplicationBlock.layer,
          Layer.makeMemoMapUnsafe(),
          graphScope,
        ),
      )
      const executable = await Effect.runPromise(
        ApplicationBlock.get.pipe(Effect.provide(graph)),
      )
      const actual: CoreContract<typeof ApplicationBlock> =
        acquisitionOf(executable).block

      expect(events).toEqual(['Implementation acquired'])

      const application = Program.makeElement({ block: actual, container })
      const runtime = Effect.runFork(
        __startProgram(application, undefined, 'Fresh'),
      )

      try {
        await vi.waitFor(() => {
          expect(runtime.pollUnsafe()).toBeUndefined()
          expect(document.body.textContent).toContain('child:one')
          expect(events).toEqual(
            expect.arrayContaining([
              'Subscription started',
              'ManagedResource acquired',
              'Mount acquired',
            ]),
          )
        })

        document.getElementById('remove-layered-child')?.click()

        await vi.waitFor(() => {
          expect(document.body.textContent).toContain('child removed')
          expect(events).toEqual(
            expect.arrayContaining([
              'Subscription stopped',
              'ManagedResource released',
              'Mount released',
            ]),
          )
        })

        expect(events.some(event => event.endsWith('handler released'))).toBe(
          false,
        )
        expect(events).not.toContain('Implementation released')

        document.getElementById('restore-layered-child')?.click()

        await vi.waitFor(() => {
          expect(document.body.textContent).toContain('child:one')
          expect(
            events.filter(event => event === 'Subscription started'),
          ).toHaveLength(2)
          expect(
            events.filter(event => event === 'ManagedResource acquired'),
          ).toHaveLength(2)
          expect(
            events.filter(event => event === 'Mount acquired'),
          ).toHaveLength(2)
        })

        expect(
          events.filter(event => event.endsWith('handler acquired')),
        ).toHaveLength(3)
        expect(
          events.filter(event => event === 'Implementation acquired'),
        ).toHaveLength(1)
      } finally {
        await Effect.runPromise(Fiber.interrupt(runtime))
      }

      expect(
        events.filter(event => event.endsWith('handler released')),
      ).toHaveLength(3)
      expect(
        events.filter(event => event === 'Subscription stopped'),
      ).toHaveLength(2)
      expect(
        events.filter(event => event === 'ManagedResource released'),
      ).toHaveLength(2)
      expect(events.filter(event => event === 'Mount released')).toHaveLength(2)
      expect(events).not.toContain('Implementation released')
    } finally {
      await Effect.runPromise(Scope.close(graphScope, Exit.void))
    }

    expect(
      events.filter(event => event === 'Implementation released'),
    ).toHaveLength(1)
  })
})
