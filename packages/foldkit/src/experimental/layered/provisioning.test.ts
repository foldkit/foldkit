import { Context, Effect, HashMap, Layer, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeInitIfMissingStep } from '../../block/mapInitialization.js'
import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import { makeDefinition } from './public.js'

class Formatting extends Context.Service<
  Formatting,
  Readonly<{ prefix: string }>
>()('LayeredFormatting') {}

const makeChild = (events: Array<string>) => {
  const Model = Schema.Struct({ label: Schema.String })
  const Message = defineMessageUnion({ UpdatedLabel: { value: Schema.String } })
  const Definition = makeDefinition('ConstructedMapChild', { Model, Message })
  const Composition = Definition.makeComposition()

  return Definition.makeBlock(
    Effect.gen(function* () {
      const formatting = yield* Formatting
      yield* Effect.sync(() => {
        events.push('Child constructed')
      })

      return {
        children: [],
        init: Composition.makeInit((label: string) => ({
          model: { label: `${formatting.prefix}${label}` },
        })),
        update: Composition.makeUpdate({
          UpdatedLabel: (model, { value }) => ({
            model: modifyFields(model, { label: () => value }),
          }),
        }),
        operations: { changeLabel: Message.UpdatedLabel },
      }
    }),
  )
}

describe('graph construction providers', () => {
  it('isolates differently provided construction recipes in one graph and rejects crossed connections', async () => {
    const events: Array<string> = []
    const ChildBlock = makeChild(events)
    const ContainerModel = Schema.Struct({ child: ChildBlock.Model })
    const ContainerMessage = defineMessageUnion({ ClickedRefresh: {} })
    const ContainerDefinition = makeDefinition('ProvidedContainer', {
      Model: ContainerModel,
      Message: ContainerMessage,
    })
    const ChildBinding = ContainerDefinition.makeRequiredFieldBinding(
      ChildBlock,
      {
        field: 'child',
        init: { contextToArgs: () => ['Project'] },
      },
    )
    const ContainerComposition = ContainerDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const ContainerBlock = ContainerDefinition.makeBlock(
      Effect.gen(function* () {
        const child = yield* ChildBinding

        return {
          children: [child],
          init: ContainerComposition.makeInit(() => ({ model: {} })),
          update: ContainerComposition.makeUpdate({
            ClickedRefresh: ContainerDefinition.makeNoopStep(),
          }),
        }
      }),
    )
    const FirstBlock = ContainerBlock.provide(
      Layer.succeed(Formatting, { prefix: 'First: ' }),
    )
    const SecondBlock = ContainerBlock.provide(
      Layer.succeed(Formatting, { prefix: 'Second: ' }),
    )
    const Model = Schema.Struct({
      first: ContainerBlock.Model,
      second: ContainerBlock.Model,
    })
    const Message = defineMessageUnion({ ClickedRefresh: {} })
    const Definition = makeDefinition('ProvidedChildren', { Model, Message })
    const FirstBinding = Definition.makeRequiredFieldBinding(FirstBlock, {
      field: 'first',
    })
    const SecondBinding = Definition.makeRequiredFieldBinding(SecondBlock, {
      field: 'second',
    })
    const Composition = Definition.makeComposition({
      bindings: [FirstBinding, SecondBinding],
    })
    const ParentBlock = Definition.makeBlock(
      Effect.gen(function* () {
        const first = yield* FirstBinding
        const second = yield* SecondBinding

        return {
          children: [first, second],
          init: Composition.makeInit(() => ({ model: {} })),
          update: Composition.makeUpdate({
            ClickedRefresh: Definition.makeNoopStep(),
          }),
        }
      }),
    )

    await Effect.runPromise(
      Effect.gen(function* () {
        const block = yield* ParentBlock.get
        const initial = block.init()
        const second = yield* SecondBlock.get.pipe(
          Effect.provide(SecondBlock.layer),
        )

        expect(initial.model.first.child.label).toBe('First: Project')
        expect(initial.model.second.child.label).toBe('Second: Project')
        expect(() => FirstBinding.connect(second)).toThrow(
          'another Block descriptor',
        )
        expect(events).toEqual(['Child constructed', 'Child constructed'])
      }).pipe(Effect.provide(ParentBlock.layer)),
    )
  })

  it('holds provided resources for the graph lifetime and retains canonical Schema contracts', async () => {
    const events: Array<string> = []
    const ChildBlock = makeChild(events)
    const FormattingLayer = Layer.effect(
      Formatting,
      Effect.acquireRelease(
        Effect.sync(() => {
          events.push('Formatting acquired')
          return { prefix: 'Project: ' }
        }),
        () =>
          Effect.sync(() => {
            events.push('Formatting released')
          }),
      ),
    )
    const ProvidedChildBlock = ChildBlock.provide(FormattingLayer)

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const context = yield* Layer.build(ProvidedChildBlock.layer)
          const provided = yield* ProvidedChildBlock.get.pipe(
            Effect.provide(context),
          )

          expect(ProvidedChildBlock.Model).toBe(ChildBlock.Model)
          expect(ProvidedChildBlock.Message).toBe(ChildBlock.Message)
          expect(provided.init('Platform').model.label).toBe(
            'Project: Platform',
          )
          expect(events).toEqual(['Formatting acquired', 'Child constructed'])
        }),
      ),
    )

    expect(events).toEqual([
      'Formatting acquired',
      'Child constructed',
      'Formatting released',
    ])
  })

  it('initializes and removes keyed Models without rebuilding the provided child Layer', async () => {
    const events: Array<string> = []
    const ChildBlock = makeChild(events).provide(
      Layer.succeed(Formatting, { prefix: '' }),
    )
    const Model = Schema.Struct({
      children: Schema.HashMap(Schema.String, ChildBlock.Model),
    })
    const Message = defineMessageUnion({
      RequestedChild: { key: Schema.String },
      UpdatedChild: { key: Schema.String, value: Schema.String },
      RemovedChild: { key: Schema.String },
    })
    const Definition = makeDefinition('ConstructedMapParent', {
      Model,
      Message,
    })
    const ChildrenBinding = Definition.makeHashMapBinding(ChildBlock, {
      field: 'children',
    })
    const Composition = Definition.makeComposition({
      bindings: [ChildrenBinding],
    })
    const ParentBlock = Definition.makeBlock(
      Effect.gen(function* () {
        const children = yield* ChildrenBinding

        return {
          children: [children],
          init: Composition.makeInit(() => ({
            model: { children: HashMap.empty() },
          })),
          update: Composition.makeUpdate({
            RequestedChild: Definition.makeStep.fromMessage(({ key }) =>
              makeInitIfMissingStep(ChildrenBinding, { key, args: [key] }),
            ),
            UpdatedChild: Definition.makeStep.fromMessage(({ key, value }) =>
              ChildrenBinding.changeLabel(key, { value }),
            ),
            RemovedChild: Definition.makeFieldsStep.fromMessage(({ key }) => ({
              children: HashMap.remove(key),
            })),
          }),
        }
      }),
    )

    expect(events).toEqual([])

    await Effect.runPromise(
      Effect.gen(function* () {
        const block = yield* ParentBlock.get
        const first = block.update(
          block.init().model,
          Message.RequestedChild({ key: 'first' }),
        )
        const changed = block.update(
          first.model,
          Message.UpdatedChild({ key: 'first', value: 'Draft' }),
        )
        const second = block.update(
          changed.model,
          Message.RequestedChild({ key: 'second' }),
        )
        const retained = Option.getOrThrow(
          HashMap.get(second.model.children, 'first'),
        )
        const repeated = block.update(
          second.model,
          Message.RequestedChild({ key: 'first' }),
        )
        const removed = block.update(
          repeated.model,
          Message.RemovedChild({ key: 'first' }),
        )
        const restored = block.update(
          removed.model,
          Message.RequestedChild({ key: 'first' }),
        )

        expect(repeated.model).toBe(second.model)
        expect(
          Option.getOrThrow(HashMap.get(restored.model.children, 'second'))
            .label,
        ).toBe('second')
        expect(
          Option.getOrThrow(HashMap.get(restored.model.children, 'first'))
            .label,
        ).toBe('first')
        expect(retained.label).toBe('Draft')
        expect(events).toEqual(['Child constructed'])
      }).pipe(Effect.provide(ParentBlock.layer)),
    )
  })
})
