import {
  Array,
  Cause,
  Data,
  Deferred,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Schema,
  Scope,
} from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import { makeDefinition } from './public.js'

class ConstructorFailure extends Data.TaggedError('ConstructorFailure')<{}> {}

const ownedScope = Effect.acquireRelease(Scope.make(), scope =>
  Scope.close(scope, Exit.void),
)

const makeFixture = (
  events: Array<string>,
  afterFirst: Effect.Effect<void, ConstructorFailure> = Effect.void,
) => {
  let nextResourceId = 0

  const ChildMessage = defineMessageUnion({
    RequestedRead: {},
    CompletedRead: { value: Schema.Number },
  })
  const ChildOutMessage = defineMessageUnion({
    Read: { value: Schema.Number },
  })
  const ChildModel = Schema.Struct({ value: Schema.Number })
  const ChildDefinition = makeDefinition('ConstructedScopeChild', {
    Model: ChildModel,
    Message: ChildMessage,
    OutMessage: ChildOutMessage,
  })
  const Read = ChildDefinition.makeCommand('Read', {
    messages: [ChildMessage.CompletedRead],
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const childInit = ChildComposition.makeInit(() => ({
    model: ChildModel.make({ value: 0 }),
  }))
  const childUpdate = ChildComposition.makeUpdate({
    RequestedRead: ChildDefinition.makeCommandsStep(() => [Read()]),
    CompletedRead: (model, { value }) => ({
      model: modifyFields(model, { value: () => value }),
      outMessage: ChildOutMessage.Read({ value }),
    }),
  })
  const ChildBlock = ChildDefinition.makeBlock(
    Effect.gen(function* () {
      const resource = yield* Effect.acquireRelease(
        Effect.sync(() => {
          nextResourceId += 1
          events.push(`Constructor acquired ${nextResourceId}`)

          return { id: nextResourceId, isOpen: true }
        }),
        resource =>
          Effect.sync(() => {
            resource.isOpen = false
            events.push(`Constructor released ${resource.id}`)
          }),
      )

      return {
        children: [],
        init: childInit,
        update: childUpdate,
        operations: { requestRead: ChildMessage.RequestedRead },
        EffectsLayer: Read.toLayer(
          Effect.acquireRelease(
            Effect.sync(() => {
              events.push(`Handler acquired ${resource.id}`)

              return () =>
                resource.isOpen
                  ? Effect.succeed(
                      ChildMessage.CompletedRead({ value: resource.id }),
                    )
                  : Effect.die(new Error('Constructor resource is closed.'))
            }),
            () =>
              Effect.sync(() => {
                events.push(`Handler released ${resource.id}`)
              }),
          ),
        ),
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
  const Definition = makeDefinition('ConstructedScopeParent', {
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
      const first = yield* FirstBinding.construct()

      yield* afterFirst

      const second = yield* SecondBinding.construct()

      return {
        children: [first, second],
        init,
        update,
      }
    }),
  )

  return {
    ParentBlock,
    ParentDefinition: Definition,
    ChildBlock,
    Message,
    FirstBinding,
    SecondBinding,
    init,
    update,
  }
}

describe('Binding construction lifetimes', () => {
  it('constructs the same descriptor separately for two fields and retains selected policies', async () => {
    const events: Array<string> = []
    const { ParentBlock, Message } = makeFixture(events)
    const construction = ParentBlock.construct()

    expect(events).toEqual([])

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const constructorScope = yield* ownedScope
          const handlerScope = yield* ownedScope
          const block = yield* construction.pipe(
            Scope.provide(constructorScope),
          )

          expect(events).toEqual([
            'Constructor acquired 1',
            'Constructor acquired 2',
          ])

          const initial = block.init()
          const first = block.update(
            initial.model,
            Message.RequestedReadFirst(),
          )
          const firstRead = Option.getOrThrow(Array.head(first.commands ?? []))

          expect(events).toHaveLength(2)

          const handlers = yield* Layer.build(block.EffectsLayer).pipe(
            Scope.provide(handlerScope),
          )
          const firstMessage = yield* firstRead.effect.pipe(
            Effect.provide(handlers),
          )
          const firstCompleted = block.update(first.model, firstMessage)
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

          expect(secondCompleted.model.received).toEqual([1, 2])
          expect(secondCompleted.model.first.value).toBe(1)
          expect(secondCompleted.model.second.value).toBe(2)
          expect(
            events.filter(event => event.startsWith('Handler acquired')),
          ).toHaveLength(2)

          yield* Scope.close(handlerScope, Exit.void)

          expect(events).toContain('Handler released 1')
          expect(events).toContain('Handler released 2')
          expect(events).not.toContain('Constructor released 1')
          expect(events).not.toContain('Constructor released 2')

          yield* Scope.close(constructorScope, Exit.void)

          expect(
            events.filter(event => event.startsWith('Constructor released')),
          ).toHaveLength(2)
        }),
      ),
    )

    expect(
      events.filter(event => event.startsWith('Handler released')),
    ).toHaveLength(2)
    expect(
      events.filter(event => event.startsWith('Constructor released')),
    ).toHaveLength(2)
  })

  it('keeps separately acquired roots alive in independent caller Scopes', async () => {
    const events: Array<string> = []
    const { ParentBlock, Message } = makeFixture(events)

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const firstScope = yield* ownedScope
          const secondScope = yield* ownedScope
          const handlerScope = yield* ownedScope
          const first = yield* ParentBlock.construct().pipe(
            Scope.provide(firstScope),
          )
          const second = yield* ParentBlock.construct().pipe(
            Scope.provide(secondScope),
          )

          expect(first).not.toBe(second)

          yield* Scope.close(firstScope, Exit.void)

          expect(events).toContain('Constructor released 1')
          expect(events).toContain('Constructor released 2')
          expect(events).not.toContain('Constructor released 3')
          expect(events).not.toContain('Constructor released 4')

          const requested = second.update(
            second.init().model,
            Message.RequestedReadFirst(),
          )
          const read = Option.getOrThrow(Array.head(requested.commands ?? []))
          const handlers = yield* Layer.build(second.EffectsLayer).pipe(
            Scope.provide(handlerScope),
          )
          const message = yield* read.effect.pipe(Effect.provide(handlers))

          expect(
            second.update(requested.model, message).model.received,
          ).toEqual([3])

          yield* Scope.close(handlerScope, Exit.void)
          yield* Scope.close(secondScope, Exit.void)
        }),
      ),
    )

    for (const resourceId of [1, 2, 3, 4]) {
      expect(
        events.filter(event => event === `Constructor released ${resourceId}`),
      ).toHaveLength(1)
    }
  })

  it('releases an acquired child when the parent constructor fails in its caller Scope', async () => {
    const events: Array<string> = []
    const failure = new ConstructorFailure()
    const { ParentBlock } = makeFixture(events, Effect.fail(failure))
    const exit = await Effect.runPromise(
      Effect.scoped(ParentBlock.construct()).pipe(Effect.exit),
    )

    expect(exit).toEqual(Exit.fail(failure))
    expect(events).toEqual(['Constructor acquired 1', 'Constructor released 1'])
  })

  it('releases the first acquired child when parent construction is interrupted', async () => {
    const events: Array<string> = []
    const started = Deferred.makeUnsafe<void>()
    const { ParentBlock } = makeFixture(
      events,
      Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
    )
    const fiber = Effect.runFork(Effect.scoped(ParentBlock.construct()))

    await Effect.runPromise(Deferred.await(started))
    await Effect.runPromise(Fiber.interrupt(fiber))

    const exit = await Effect.runPromise(Fiber.await(fiber))

    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(
      true,
    )
    expect(events).toEqual(['Constructor acquired 1', 'Constructor released 1'])
  })

  it('rejects an acquired child from another live construction graph', async () => {
    const events: Array<string> = []
    const {
      ChildBlock,
      ParentDefinition,
      FirstBinding,
      SecondBinding,
      init,
      update,
    } = makeFixture(events)
    const childScope = await Effect.runPromise(Scope.make())
    const parentScope = await Effect.runPromise(Scope.make())
    const child = await Effect.runPromise(
      ChildBlock.construct().pipe(Scope.provide(childScope)),
    )
    const parent = ParentDefinition.makeBlock(
      Effect.gen(function* () {
        const second = yield* SecondBinding.construct()

        return {
          children: [FirstBinding.connect(child), second],
          init,
          update,
        }
      }),
    )

    await expect(
      Effect.runPromise(parent.construct().pipe(Scope.provide(parentScope))),
    ).rejects.toThrow(/only an executable acquired in this construction graph/i)

    await Effect.runPromise(Scope.close(childScope, Exit.void))
    await Effect.runPromise(Scope.close(parentScope, Exit.void))
  })

  it('rejects a child connection after its acquisition Scope closes', async () => {
    const events: Array<string> = []
    const { ChildBlock, FirstBinding } = makeFixture(events)
    const child = await Effect.runPromise(Effect.scoped(ChildBlock.construct()))

    expect(() => FirstBinding.connect(child)).toThrow(
      /after its acquisition Scope has closed/i,
    )
  })

  it('rejects an erased child operation that collides with Binding.construct', async () => {
    const Message = defineMessageUnion({ RequestedRead: {} })
    const ChildDefinition = makeDefinition('ConstructedCollisionChild', {
      Model: Schema.Struct({ value: Schema.Number }),
      Message,
    })
    const Composition = ChildDefinition.makeComposition()
    const ChildBlock = ChildDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: Composition.makeInit(() => ({ model: { value: 0 } })),
        update: Composition.makeUpdate({
          RequestedRead: ChildDefinition.makeNoopStep(),
        }),
        operations: { construct: Message.RequestedRead },
      }),
    )
    const ParentDefinition = makeDefinition('ConstructedCollisionParent', {
      Model: Schema.Struct({ child: ChildBlock.Model }),
      Message: defineMessageUnion({}),
    })
    const binding = Reflect.apply(
      ParentDefinition.makeRequiredFieldBinding,
      ParentDefinition,
      [ChildBlock, { field: 'child' }],
    )
    const construction = Reflect.apply(
      Reflect.get(binding, 'construct'),
      binding,
      [],
    )

    await expect(
      Reflect.apply(Effect.runPromise, Effect, [construction]),
    ).rejects.toThrow('reserves the Binding operation name "construct"')
  })
})
