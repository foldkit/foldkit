import { Context, Effect, Layer, Option, Ref, Schema, Scope } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { inspectBinding } from './binding.js'
import { makeDefinition, makeNamespace } from './define.js'
import { identityOf } from './identity.js'
import * as Block from './public.js'
import {
  invocationContext,
  qualifyCommand,
  qualifyContext,
  qualifyLayer,
  selectLayer,
} from './scope.js'

const Message = defineMessageUnion({
  RequestedValue: {},
  CompletedReadValue: { value: Schema.String },
})

class ValueSource extends Context.Service<
  ValueSource,
  Readonly<{ value: string }>
>()('ScopeTest/ValueSource') {}

const ScopeParentModel = Schema.Struct({})
const ScopeParent = makeDefinition('ScopeTestParent', {
  Model: ScopeParentModel,
  Message: Schema.Never,
})

const makeFeature = (id: string, onConstruct: () => void = () => {}) => {
  const FeatureNamespace = makeNamespace(id)
  const ReadValue = FeatureNamespace.makeCommand('ReadValue', {
    messages: [Message.CompletedReadValue],
    handler: function* () {
      const source = yield* ValueSource
      onConstruct()

      return () =>
        Effect.succeed(Message.CompletedReadValue({ value: source.value }))
    },
  })

  const composition = FeatureNamespace.makeDefinition({
    Model: Schema.Struct({}),
    Message,
  }).makeComposition()
  const update = composition.makeUpdate({
    RequestedValue: model => ({
      model,
      commands: [ReadValue()],
    }),
    CompletedReadValue: model => ({
      model,
      commands: [ReadValue()],
    }),
  })
  const prepareBlock = () =>
    composition.prepareBlock({
      init: () => ({ model: {} }),
      update,
      EffectsLayer: ReadValue.layer,
    })
  const block: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof composition.Model,
    typeof prepareBlock
  > = Block.assemble(prepareBlock)
  const bind = (placement: string) =>
    ScopeParent.makeBinding(block, {
      placement,
      read: model => Option.some(model),
      write: (_model, nextChild) => nextChild,
    })
  return { FeatureNamespace, ReadValue, block, bind }
}

const execute = <Services, Error, Message>(
  layer: Layer.Layer<Services, Error>,
  command: Readonly<{ effect: Effect.Effect<Message, unknown, Services> }>,
) =>
  Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const context = yield* Layer.build(layer)
        // oxlint-disable-next-line effecttsgo/any-unknown-in-error-context
        return yield* Effect.provideContext(command.effect, context)
      }),
    ),
  )

describe('Block capability contexts', () => {
  it('constructs a shared selection once and aliases it to repeated placements', async () => {
    let constructions = 0
    const feature = makeFeature('SharedScope', () => {
      constructions += 1
    })
    const LeftBinding = feature.bind('Left')
    const RightBinding = feature.bind('Right')
    const LeftComposition = ScopeParent.makeComposition({
      bindings: [LeftBinding],
    })
    const RightComposition = ScopeParent.makeComposition({
      bindings: [RightBinding],
    })
    const foldLeft = LeftComposition.makeUpdate({})
    const foldRight = RightComposition.makeUpdate({})
    const model = { child: {} }
    const leftCommand = foldLeft(model, {
      _tag: 'GotLeftMessage',
      placement: 'Left',
      generation: 0,
      message: Message.RequestedValue(),
    }).commands!
    const rightCommand = foldRight(model, {
      _tag: 'GotRightMessage',
      placement: 'Right',
      generation: 0,
      message: Message.RequestedValue(),
    }).commands!
    const layer = Layer.merge(
      inspectBinding(LeftBinding).EffectsLayer,
      inspectBinding(RightBinding).EffectsLayer,
    ).pipe(Layer.provide(Layer.succeed(ValueSource, { value: 'shared' })))

    const results = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const context = yield* Layer.build(layer)
          return yield* Effect.forEach(
            [...leftCommand, ...rightCommand],
            command => Effect.provideContext(command.effect, context),
          )
        }),
      ),
    )

    expect(constructions).toBe(1)
    expect(results).toEqual([
      {
        _tag: 'GotLeftMessage',
        placement: 'Left',
        generation: 0,
        message: Message.CompletedReadValue({ value: 'shared' }),
      },
      {
        _tag: 'GotRightMessage',
        placement: 'Right',
        generation: 0,
        message: Message.CompletedReadValue({ value: 'shared' }),
      },
    ])
    expect(leftCommand.map(command => command.name)).toEqual(['Left/ReadValue'])
    expect(rightCommand.map(command => command.name)).toEqual([
      'Right/ReadValue',
    ])
  })

  it('isolates captures when the same raw handler recipe is selected with different providers', async () => {
    const feature = makeFeature('SelectedScope')
    const leftBlock = feature.block.replaceEffectsLayer(
      feature.ReadValue.layer.pipe(
        Layer.provide(Layer.succeed(ValueSource, { value: 'left' })),
      ),
    )
    const LeftBinding = ScopeParent.makeBinding(leftBlock, {
      placement: 'Left',
      read: model => Option.some(model),
      write: (_model, nextChild) => nextChild,
    })
    const rightBlock = feature.block.replaceEffectsLayer(
      feature.ReadValue.layer.pipe(
        Layer.provide(Layer.succeed(ValueSource, { value: 'right' })),
      ),
    )
    const RightBinding = ScopeParent.makeBinding(rightBlock, {
      placement: 'Right',
      read: model => Option.some(model),
      write: (_model, nextChild) => nextChild,
    })
    const LeftComposition = ScopeParent.makeComposition({
      bindings: [LeftBinding],
    })
    const RightComposition = ScopeParent.makeComposition({
      bindings: [RightBinding],
    })
    const foldLeft = LeftComposition.makeUpdate({})
    const foldRight = RightComposition.makeUpdate({})
    const layer = Layer.merge(
      inspectBinding(LeftBinding).EffectsLayer,
      inspectBinding(RightBinding).EffectsLayer,
    )
    const leftCommands =
      foldLeft(
        {},
        {
          _tag: 'GotLeftMessage',
          placement: 'Left',
          generation: 0,
          message: Message.RequestedValue(),
        },
      ).commands ?? []
    const rightCommands =
      foldRight(
        {},
        {
          _tag: 'GotRightMessage',
          placement: 'Right',
          generation: 0,
          message: Message.RequestedValue(),
        },
      ).commands ?? []

    const results = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const context = yield* Layer.build(layer)
          const leftResults = yield* Effect.forEach(leftCommands, command =>
            Effect.provideContext(command.effect, context),
          )
          const rightResults = yield* Effect.forEach(rightCommands, command =>
            Effect.provideContext(command.effect, context),
          )
          return [...leftResults, ...rightResults]
        }),
      ),
    )

    expect(results).toEqual([
      {
        _tag: 'GotLeftMessage',
        placement: 'Left',
        generation: 0,
        message: Message.CompletedReadValue({ value: 'left' }),
      },
      {
        _tag: 'GotRightMessage',
        placement: 'Right',
        generation: 0,
        message: Message.CompletedReadValue({ value: 'right' }),
      },
    ])
  })

  it('isolates a selected recipe from a raw handler already built in the ambient memo map', async () => {
    const feature = makeFeature('PrimedScope')
    const ambient = feature.ReadValue.layer.pipe(
      Layer.provide(Layer.succeed(ValueSource, { value: 'ambient' })),
    )
    const selectedBlock = feature.block.replaceEffectsLayer(
      feature.ReadValue.layer.pipe(
        Layer.provide(Layer.succeed(ValueSource, { value: 'selected' })),
      ),
    )
    const SelectedBinding = ScopeParent.makeBinding(selectedBlock, {
      placement: 'Selected',
      read: model => Option.some(model),
      write: (_model, nextChild) => nextChild,
    })
    const composition = ScopeParent.makeComposition({
      bindings: [SelectedBinding],
    })
    const foldSelected = composition.makeUpdate({})
    const commands =
      foldSelected(
        {},
        {
          _tag: 'GotSelectedMessage',
          placement: 'Selected',
          generation: 0,
          message: Message.RequestedValue(),
        },
      ).commands ?? []
    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const scope = yield* Scope.Scope
          const memoMap = Layer.makeMemoMapUnsafe()
          yield* Layer.buildWithMemoMap(ambient, memoMap, scope)
          const context = yield* Layer.buildWithMemoMap(
            inspectBinding(SelectedBinding).EffectsLayer,
            memoMap,
            scope,
          )
          return yield* Effect.forEach(commands, command =>
            Effect.provideContext(command.effect, context),
          )
        }),
      ),
    )
    expect(result).toEqual([
      {
        _tag: 'GotSelectedMessage',
        placement: 'Selected',
        generation: 0,
        message: Message.CompletedReadValue({ value: 'selected' }),
      },
    ])
  })

  it('supports the same local ID in different composition branches', async () => {
    const left = makeFeature('Feature')
    const right = makeFeature('Feature')
    const leftLayer = qualifyLayer(
      'Left',
      selectLayer(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        left.FeatureNamespace as never,
        left.ReadValue.layer.pipe(
          Layer.provide(Layer.succeed(ValueSource, { value: 'left' })),
        ),
      ),
    )
    const rightLayer = qualifyLayer(
      'Right',
      selectLayer(
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        right.FeatureNamespace as never,
        right.ReadValue.layer.pipe(
          Layer.provide(Layer.succeed(ValueSource, { value: 'right' })),
        ),
      ),
    )
    const layer = Layer.merge(leftLayer, rightLayer)

    const result = await execute(
      layer,
      qualifyCommand('Right', right.ReadValue()),
    )

    expect(result).toEqual(Message.CompletedReadValue({ value: 'right' }))
  })

  it('keeps nested capability paths aligned with nested invocation contexts', async () => {
    const feature = makeFeature('NestedScope')
    const layer = qualifyLayer(
      'App',
      qualifyLayer('Panel', feature.block.EffectsLayer),
    ).pipe(Layer.provide(Layer.succeed(ValueSource, { value: 'nested' })))
    const command = qualifyCommand(
      'App',
      qualifyCommand('Panel', feature.ReadValue()),
    )

    expect(command.name).toBe('App/Panel/ReadValue')
    expect(await execute(layer, command)).toEqual(
      Message.CompletedReadValue({ value: 'nested' }),
    )
  })

  it('uses independent resource slots for repeated placements while sharing the handler', async () => {
    const FeatureNamespace = makeNamespace('ResourceScope')
    const Value = FeatureNamespace.makeResource<string>()('Value')
    const ReadValue = FeatureNamespace.makeCommand('ReadValue', {
      messages: [Message.CompletedReadValue],
      handler: function* () {
        return () =>
          Value.get.pipe(
            Effect.map(value => Message.CompletedReadValue({ value })),
            Effect.catch(() =>
              Effect.succeed(Message.CompletedReadValue({ value: 'inactive' })),
            ),
          )
      },
    })
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const selected = selectLayer(FeatureNamespace as never, ReadValue.layer)
    const layer = Layer.merge(
      qualifyLayer('Left', selected),
      qualifyLayer('Right', selected),
    )

    const results = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const leftRef = yield* Ref.make(Option.some('left'))
          const rightRef = yield* Ref.make(Option.some('right'))
          const resources = Context.merge(
            qualifyContext('Left', Context.make(Value._tag, leftRef)),
            qualifyContext('Right', Context.make(Value._tag, rightRef)),
          )
          const handlers = yield* Layer.build(layer).pipe(
            Effect.provideContext(resources),
          )
          const context = Context.merge(resources, handlers)
          return yield* Effect.forEach(
            [
              qualifyCommand('Left', ReadValue()),
              qualifyCommand('Right', ReadValue()),
            ],
            command => {
              const effect: Effect.Effect<
                typeof Message.Type,
                never,
                Layer.Success<typeof layer>
              > = command.effect
              return Effect.provideContext(effect, context)
            },
          )
        }),
      ),
    )

    expect(results).toEqual([
      Message.CompletedReadValue({ value: 'left' }),
      Message.CompletedReadValue({ value: 'right' }),
    ])
  })

  it('does not expose a sibling capability through a local view context', () => {
    const feature = makeFeature('ViewScope')
    const left = qualifyContext(
      'Left',
      Context.make(ValueSource, { value: 'shared' }),
    )
    const service = identityOf(feature.ReadValue)!.service
    const rightHandler = qualifyContext('Right', Context.make(service, {}))
    const context = invocationContext('Left', Context.merge(left, rightHandler))

    expect(Context.get(context, ValueSource).value).toBe('shared')
    expect(Context.getOption(context, service)).toEqual(Option.none())
  })

  it('projects ordinary Services, local capabilities, and descendant capabilities while isolating siblings', () => {
    const feature = makeFeature('ProjectedScope')
    const sibling = makeFeature('SiblingScope')
    const ResourceScopeNamespace = makeNamespace('ProjectedResourceScope')
    const Value = ResourceScopeNamespace.makeResource<string>()('Value')
    const service = identityOf(feature.ReadValue)!.service
    const siblingService = identityOf(sibling.ReadValue)!.service
    const source = { value: 'shared' }
    const localHandler = {}
    const childHandler = {}
    const siblingHandler = {}
    const localRef = Ref.makeUnsafe(Option.some('local'))
    const childRef = Ref.makeUnsafe(Option.some('child'))
    const context = Context.merge(
      Context.make(ValueSource, source),
      Context.merge(
        qualifyContext(
          'Left:',
          Context.merge(
            Context.make(service, localHandler),
            Context.make(Value._tag, localRef),
          ),
        ),
        Context.merge(
          qualifyContext(
            'Left:',
            qualifyContext(
              'Child',
              Context.merge(
                Context.make(service, childHandler),
                Context.make(Value._tag, childRef),
              ),
            ),
          ),
          qualifyContext('Right', Context.make(siblingService, siblingHandler)),
        ),
      ),
    )

    const left = invocationContext('Left:', context)
    const child = invocationContext('Child', left)

    expect(Context.get(left, ValueSource)).toBe(source)
    expect(Context.get(left, service)).toBe(localHandler)
    expect(Context.get(left, Value._tag)).toBe(localRef)
    expect(Context.get(child, ValueSource)).toBe(source)
    expect(Context.get(child, service)).toBe(childHandler)
    expect(Context.get(child, Value._tag)).toBe(childRef)
    expect(Context.getOption(left, siblingService)).toEqual(Option.none())
  })

  it('indexes one stable parent Context once across sibling projections', () => {
    class InstrumentedContextMap extends Map<string, any> {
      iterationCount = 0

      override [Symbol.iterator](): MapIterator<[string, any]> {
        this.iterationCount += 1
        return super[Symbol.iterator]()
      }
    }

    const feature = makeFeature('IndexedScope')
    const service = identityOf(feature.ReadValue)!.service
    const entries = new InstrumentedContextMap(
      Context.merge(
        qualifyContext('Left', Context.make(service, {})),
        qualifyContext('Right', Context.make(service, {})),
      ).mapUnsafe,
    )
    const context = Context.makeUnsafe<never>(entries)

    invocationContext('Left', context)
    invocationContext('Right', context)

    expect(entries.iterationCount).toBe(1)
  })

  it('indexes a fresh Context after an ordinary Service changes', () => {
    const initialSource = { value: 'initial' }
    const updatedSource = { value: 'updated' }
    const initialContext = Context.make(ValueSource, initialSource)

    const initial = invocationContext('Feature', initialContext)
    const updated = invocationContext(
      'Feature',
      Context.add(initialContext, ValueSource, updatedSource),
    )

    expect(Context.get(initial, ValueSource)).toBe(initialSource)
    expect(Context.get(updated, ValueSource)).toBe(updatedSource)
  })

  it('rejects a same-shaped Layer from a different definition before invocation', async () => {
    const intended = makeFeature('SharedId')
    const unrelated = makeFeature('SharedId')
    const selected = intended.block.replaceEffectsLayer(
      unrelated.ReadValue.layer.pipe(
        Layer.provide(Layer.succeed(ValueSource, { value: 'wrong' })),
      ),
    )

    await expect(
      Effect.runPromise(Effect.scoped(Layer.build(selected.EffectsLayer))),
    ).rejects.toThrow('belongs to a different definition')
  })

  it('rejects ManagedResource access from an arbitrary Layer in a handler recipe', async () => {
    const FeatureNamespace = makeNamespace('ConstructionScope')
    const Value = FeatureNamespace.makeResource<string>()('Value')
    const layer = selectLayer(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      FeatureNamespace as never,
      Layer.effect(
        ValueSource,
        Value.get.pipe(Effect.map(value => ({ value }))),
      ),
    )

    await expect(
      Effect.runPromise(
        Effect.scoped(
          Layer.build(layer).pipe(
            Effect.provideService(
              Value._tag,
              Ref.makeUnsafe(Option.some('unavailable during construction')),
            ),
          ),
        ),
      ),
    ).rejects.toThrow('cannot be read while constructing a handler')
  })
})
