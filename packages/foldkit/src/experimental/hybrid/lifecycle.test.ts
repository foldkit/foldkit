import {
  Cause,
  Effect,
  Exit,
  Fiber,
  Layer,
  Option,
  Schema,
  Stream,
} from 'effect'
import { afterEach, expect, it, vi } from 'vitest'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Program from '../../runtime/programPublic.js'
import { modifyFields } from '../../struct/index.js'
import * as Hybrid from './public.js'

afterEach(() => {
  document.body.innerHTML = ''
})

const ProviderContract = (() => {
  const Model = Schema.Struct({})
  type Model = typeof Model.Type
  const ChildDefinition = Block.makeDefinition('HybridProviderIdentity', {
    Model,
    Message: Schema.Never,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const prepare = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({ model: {} })),
      update: ChildComposition.makeUpdate({}),
    })
  const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepare
  > = Block.assemble(prepare)

  return ChildBlock
})()

const makeProviderIdentityFixture = () => {
  const events: Array<string> = []
  const Primary = Hybrid.fromBlock(
    'HybridProviderPrimary',
    ProviderContract,
    Effect.sync(() => {
      events.push('Primary constructed')
      return ProviderContract
    }),
  )
  const Secondary = Hybrid.fromBlock(
    'HybridProviderSecondary',
    ProviderContract,
    Effect.sync(() => {
      events.push('Secondary constructed')
      return ProviderContract
    }),
  )

  return { events, Primary, Secondary }
}

it('keeps separately supplied constructors distinct for the same child contract', async () => {
  const { events, Primary, Secondary } = makeProviderIdentityFixture()

  expect(events).toEqual([])

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* Primary('primary')
      yield* Secondary('secondary')
    }).pipe(Effect.provide(Layer.merge(Primary.layer, Secondary.layer))),
  )

  expect(events).toEqual(['Primary constructed', 'Secondary constructed'])
})

it('uses the selected ordinary Layer implementation for the same explicit provider identity', async () => {
  const { events, Primary } = makeProviderIdentityFixture()
  const Alternative = Hybrid.fromBlock(
    'HybridProviderPrimary',
    Primary.contract,
    Effect.sync(() => {
      events.push('Alternative constructed')
      return Primary.contract
    }),
  )

  await Effect.runPromise(
    Effect.all([Primary('primary'), Alternative('alternative')]).pipe(
      Effect.provide(Alternative.layer),
    ),
  )

  expect(events).toEqual(['Alternative constructed', 'Alternative constructed'])
})

if (false) {
  const { Primary, Secondary } = makeProviderIdentityFixture()

  Effect.runSync(
    // @ts-expect-error Each distinct constructor identity requires its own provider.
    Effect.all([Primary('primary'), Secondary('secondary')]).pipe(
      Effect.provide(Primary.layer),
    ),
  )
}

it('keeps constructed executables alive while Model-owned engine lifecycles stop and restart', async () => {
  const events: Array<string> = []
  const EngineModel = Schema.Struct({
    maybeSquare: Schema.Option(Schema.Number),
  })
  type EngineModel = typeof EngineModel.Type
  const EngineMessage = defineMessageUnion({
    ClickedCompute: {},
    CompletedCompute: { square: Schema.Number },
    AcquiredEngine: {},
    ReleasedEngine: {},
    FailedAcquireEngine: {},
  })
  type EngineMessage = typeof EngineMessage.Type
  const EngineDefinition = Block.makeDefinition('HybridLifecycleEngine', {
    Model: EngineModel,
    Message: EngineMessage,
  })
  const Engine = EngineDefinition.makeResource<{
    square: (value: number) => number
  }>()('Engine')
  const Compute = EngineDefinition.makeCommand('Compute', {
    messages: [EngineMessage.CompletedCompute],
    handler: function* () {
      return () =>
        Engine.get.pipe(
          Effect.orDie,
          Effect.map(engine =>
            EngineMessage.CompletedCompute({ square: engine.square(3) }),
          ),
        )
    },
  })
  const managedResources = EngineDefinition.makeManagedResources(entry => ({
    engine: entry('ManageEngine', Schema.Option(Schema.Null), {
      resource: Engine,
      modelToMaybeRequirements: () => Option.some(null),
      onAcquired: () => EngineMessage.AcquiredEngine(),
      onReleased: () => EngineMessage.ReleasedEngine(),
      onAcquireError: () => EngineMessage.FailedAcquireEngine(),
      handler: function* () {
        return {
          acquire: () =>
            Effect.sync(() => {
              events.push('Engine acquired')
              return { square: (value: number) => value * value }
            }),
          release: () =>
            Effect.sync(() => {
              events.push('Engine released')
            }),
        }
      },
    }),
  }))
  const subscriptions = EngineDefinition.makeSubscriptions(entry => ({
    activity: entry('ObserveEngine', {
      messages: [],
      handler: function* () {
        return () =>
          Stream.fromEffect(
            Effect.sync(() => {
              events.push('Subscription started')
            }),
          ).pipe(
            Stream.flatMap(() => Stream.never),
            Stream.ensuring(
              Effect.sync(() => {
                events.push('Subscription stopped')
              }),
            ),
          )
      },
    }),
  }))
  const EngineComposition = EngineDefinition.makeComposition()
  const prepareEngine = () =>
    EngineComposition.prepareBlock({
      init: EngineComposition.makeInit(() => ({
        model: { maybeSquare: Option.none() },
      })),
      update: EngineComposition.makeUpdate({
        ClickedCompute: model => ({ model, commands: [Compute()] }),
        CompletedCompute: EngineDefinition.makeFieldsStep.fromMessage(
          ({ square }) => ({ maybeSquare: () => Option.some(square) }),
        ),
        AcquiredEngine: EngineDefinition.makeNoopStep(),
        ReleasedEngine: EngineDefinition.makeNoopStep(),
        FailedAcquireEngine: EngineDefinition.makeNoopStep(),
      }),
      view: EngineComposition.makeView((model, h) =>
        h.section(
          [],
          [
            h.button(
              [h.Id('compute'), h.OnClick(EngineMessage.ClickedCompute())],
              ['Compute'],
            ),
            Option.match(model.maybeSquare, {
              onNone: () => h.span([], ['Engine ready']),
              onSome: square => h.span([], [`Square: ${square}`]),
            }),
          ],
        ),
      ),
      managedResources,
      subscriptions,
      EffectsLayer: Layer.mergeAll(
        Compute.layer,
        managedResources.layer,
        subscriptions.layer,
      ),
    })
  const EngineBlock: Block.FromAssemblyWithView<
    typeof EngineModel,
    typeof prepareEngine
  > = Block.assemble(prepareEngine)
  const ConstructedEngine = Hybrid.fromBlock(
    'HybridLifecycleEngineConstructor',
    EngineBlock,
    Effect.acquireRelease(
      Effect.sync(() => {
        events.push('Executable constructed')
        return EngineBlock
      }),
      () =>
        Effect.sync(() => {
          events.push('Executable released')
        }),
    ),
  )

  const Model = Schema.Struct({ maybeEngine: Schema.Option(EngineModel) })
  type Model = typeof Model.Type
  const Message = defineMessageUnion({
    ClickedRemoveEngine: {},
    ClickedAddEngine: {},
  })
  type Message = typeof Message.Type
  const ApplicationDefinition = Hybrid.makeDefinition('HybridLifecycleRoot', {
    Model,
    Message,
  })
  const EngineBinding = ApplicationDefinition.makeOptionalFieldBinding(
    EngineBlock,
    {
      placement: 'engine',
      field: 'maybeEngine',
      init: { contextToArgs: () => Option.some([]) },
    },
  )
  const ApplicationComposition = ApplicationDefinition.makeComposition({
    bindings: [EngineBinding],
  })
  const init = ApplicationComposition.makeInit(() => ({ model: {} }))
  const update = ApplicationComposition.makeUpdate({
    ClickedRemoveEngine: ApplicationDefinition.makeFieldsStep(() => ({
      maybeEngine: () => Option.none(),
    })),
    ClickedAddEngine: model =>
      EngineBinding.init({
        args: [],
        toParentModel: engine =>
          modifyFields(model, { maybeEngine: () => Option.some(engine) }),
      }),
  })
  const view = ApplicationComposition.makeView((model, h) =>
    h.main(
      [],
      [
        h.button(
          [h.Id('remove'), h.OnClick(Message.ClickedRemoveEngine())],
          ['Remove engine'],
        ),
        h.button(
          [h.Id('add'), h.OnClick(Message.ClickedAddEngine())],
          ['Add engine'],
        ),
        Option.match(model.maybeEngine, {
          onNone: () => h.span([], ['Engine absent']),
          onSome: engine =>
            h.block(
              EngineBinding.embedView({ slotId: 'engine', model: engine }),
            ),
        }),
      ],
    ),
  )
  const ApplicationBlock = ApplicationComposition.makeBlock(
    Effect.gen(function* () {
      const engine = yield* ConstructedEngine('engine')

      return {
        bindings: [EngineBinding.connect(engine)],
        init,
        update,
        view,
      }
    }),
  )
  const container = document.createElement('div')
  container.id = 'hybrid-engine-lifecycle'
  document.body.appendChild(container)

  expect(events).toEqual([])

  const fiber = Effect.runFork(
    Effect.scoped(
      Effect.gen(function* () {
        const block = yield* ApplicationBlock.build.pipe(
          Effect.provide(ConstructedEngine.layer),
        )
        const program = Program.makeElement({ block, container })

        yield* program.start()
      }),
    ),
  )

  try {
    await vi.waitFor(() => {
      const exit = fiber.pollUnsafe()

      if (exit !== undefined && Exit.isFailure(exit)) {
        throw new Error(Cause.pretty(exit.cause))
      }

      expect(events).toContain('Engine acquired')
      expect(events).toContain('Subscription started')
      expect(document.body.textContent).toContain('Engine ready')
    })
    document.querySelector<HTMLButtonElement>('#compute')?.click()

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Square: 9')
    })
    document.querySelector<HTMLButtonElement>('#remove')?.click()

    await vi.waitFor(() => {
      expect(events).toContain('Engine released')
      expect(events).toContain('Subscription stopped')
      expect(document.body.textContent).toContain('Engine absent')
    })
    expect(events).not.toContain('Executable released')

    document.querySelector<HTMLButtonElement>('#add')?.click()

    await vi.waitFor(() => {
      expect(events.filter(event => event === 'Engine acquired')).toHaveLength(
        2,
      )
      expect(
        events.filter(event => event === 'Subscription started'),
      ).toHaveLength(2)
    })
    expect(
      events.filter(event => event === 'Executable constructed'),
    ).toHaveLength(1)
    document.querySelector<HTMLButtonElement>('#compute')?.click()

    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Square: 9')
    })
  } finally {
    await Effect.runPromise(Fiber.interrupt(fiber))
  }

  expect(events.filter(event => event === 'Engine released')).toHaveLength(2)
  expect(events.filter(event => event === 'Subscription stopped')).toHaveLength(
    2,
  )
  expect(events.filter(event => event === 'Executable released')).toHaveLength(
    1,
  )
})
