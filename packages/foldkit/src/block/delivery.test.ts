import { Array, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { defineMessageUnion } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import {
  makeCompositionUpdate,
  registerBindingDelivery,
  trackParentMessageMapper,
} from './delivery.js'
import { assertRegisteredBinding } from './operationGraph.js'
import * as Block from './public.js'

const ChildMessage = defineMessageUnion({
  ChangedCount: { amount: Schema.Number },
})

const Message = defineMessageUnion({
  GotFirstMessage: { message: ChildMessage },
  GotSecondMessage: { message: ChildMessage },
  ClickedReset: {},
})

const changedCount = ChildMessage.ChangedCount({ amount: 2 })
const ParentEnvelope = Schema.Struct({ message: ChildMessage })
const childMessageOf = (message: Readonly<{ _tag: string }>) =>
  Schema.decodeUnknownSync(ParentEnvelope)(message).message

describe('Composition update delivery', () => {
  it('rejects an omitted route for a generated child update with required context', () => {
    const ContextualChildModel = Schema.Struct({ count: Schema.Number })
    const ContextualChildMessage = defineMessageUnion({
      ChangedCount: { amount: Schema.Number },
    })

    const contextualComposition = makeDefinition('DeliveryContextualChild', {
      Model: ContextualChildModel,
      Message: ContextualChildMessage,
    }).makeComposition()
    const prepareContextualBlock = () =>
      contextualComposition.prepareBlock({
        init: contextualComposition.makeInit(() => ({
          model: ContextualChildModel.make({ count: 0 }),
        })),
        update: contextualComposition.makeUpdate.withContext(
          (
            _context: Readonly<{
              source: 'Required'
            }>,
          ) => ({
            ChangedCount: (model, _message) => ({
              model,
            }),
          }),
        ),
      })
    const contextualBlock: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof ContextualChildModel,
      typeof prepareContextualBlock
    > = Block.assemble(prepareContextualBlock)
    const ContextualParentModel = Schema.Struct({
      child: ContextualChildModel,
    })
    const ContextualParent = makeDefinition('DeliveryContextualParent', {
      Model: ContextualParentModel,
      Message: Schema.Never,
    })

    expect(contextualBlock.update.length).toBe(2)
    expect(() =>
      Reflect.apply(ContextualParent.makeBinding, undefined, [
        contextualBlock,
        {
          field: 'child',
        },
      ]),
    ).toThrow('A contextual child update requires delivery.toUpdateContext')
  })

  it('routes one parent Message through the Binding native fold', () => {
    const foldResult = {
      model: { count: 3 },
      commands: [{ kind: 'Command' }],
      outMessage: { _tag: 'ReportedCount', count: 3 },
    }
    const binding = {
      placement: 'first',
      fold: vi.fn(() => foldResult),
    }
    const trackedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(binding, trackedMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    const update = makeCompositionUpdate(Message, [binding], false)({})
    const model = { count: 1 }
    const message = trackedMapper.toParentMessage(changedCount)

    const result = update(model, message)

    expect(binding.fold).toHaveBeenCalledWith(model, changedCount)
    expect(result).toBe(foldResult)
  })

  it('routes native keyed tuples through the real fold and ignores stale keys', () => {
    const CounterModel = Schema.Struct({ count: Schema.Number })

    const CounterComposition = makeDefinition('DeliveryCounter', {
      Model: CounterModel,
      Message: ChildMessage,
    }).makeComposition()
    const prepareCounterBlock = () =>
      CounterComposition.prepareBlock({
        init: CounterComposition.makeInit(() => ({
          model: CounterModel.make({ count: 0 }),
        })),
        update: CounterComposition.makeUpdate.withContext(
          (
            context: Readonly<{
              multiplier: number
            }>,
          ) => ({
            ChangedCount: (model, message) => ({
              model: modifyFields(model, {
                count: count => count + message.amount * context.multiplier,
              }),
            }),
          }),
        ),
      })
    const counterBlock: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof CounterModel,
      typeof prepareCounterBlock
    > = Block.assemble(prepareCounterBlock)
    const CounterInstance = Schema.Struct({
      id: Schema.String,
      counter: CounterModel,
    })
    const ParentModel = Schema.Struct({
      counters: Schema.Array(CounterInstance),
      activeId: Schema.String,
      multiplier: Schema.Number,
    })
    const Parent = makeDefinition('DeliveryCounterParent', {
      Model: ParentModel,
      Message: Schema.Never,
    })
    const CounterBinding = Parent.makeBinding(counterBlock, {
      readAll: model => model.counters,
      key: instance => instance.id,
      read: instance => instance.counter,
      writeAt: (model, id, nextCounter) =>
        modifyFields(model, {
          counters: Array.map(instance =>
            instance.id === id
              ? modifyFields(instance, { counter: () => nextCounter })
              : instance,
          ),
        }),
      keySchema: Schema.String,
      delivery: {
        when: (model, id) => {
          expectTypeOf(model).toEqualTypeOf<typeof ParentModel.Type>()
          expectTypeOf(id).toEqualTypeOf<string>()
          return id === model.activeId
        },
        toUpdateContext: model => [{ multiplier: model.multiplier }],
      },
    })
    const ParentComposition = Parent.makeComposition({
      bindings: [CounterBinding],
    })
    const update = ParentComposition.makeUpdate({})
    const model = ParentModel.make({
      counters: [
        CounterInstance.make({
          id: 'active',
          counter: CounterModel.make({ count: 1 }),
        }),
        CounterInstance.make({
          id: 'stale',
          counter: CounterModel.make({ count: 10 }),
        }),
      ],
      activeId: 'active',
      multiplier: 3,
    })
    const activeUpdate = update(model, {
      _tag: 'GotDeliveryCounterMessage',
      placement: 'DeliveryCounter',
      generation: 0,
      key: 'active',
      message: changedCount,
    })
    const staleUpdate = update(model, {
      _tag: 'GotDeliveryCounterMessage',
      placement: 'DeliveryCounter',
      generation: 0,
      key: 'stale',
      message: changedCount,
    })

    expect(activeUpdate.model.counters).toEqual([
      CounterInstance.make({
        id: 'active',
        counter: CounterModel.make({ count: 7 }),
      }),
      CounterInstance.make({
        id: 'stale',
        counter: CounterModel.make({ count: 10 }),
      }),
    ])
    expect(staleUpdate.model).toBe(model)
  })

  it.each([
    {
      name: 'a non-Option',
      resolveArguments: () => [changedCount],
      error: 'fromParentMessage.args must return an Option of fold arguments',
    },
    {
      name: 'Some without a tuple',
      resolveArguments: () => Option.some({ message: changedCount }),
      error: 'fromParentMessage.args must contain a fold argument tuple',
    },
  ])(
    'rejects $name from an erased argument resolver',
    ({ resolveArguments, error }) => {
      const binding = { placement: 'first', fold: vi.fn() }
      const trackedMapper = trackParentMessageMapper(
        (message: typeof changedCount) => Message.GotFirstMessage({ message }),
      )
      Reflect.apply(registerBindingDelivery, undefined, [
        binding,
        trackedMapper,
        {
          fromParentMessage: {
            parentMessage: Message.GotFirstMessage,
            args: resolveArguments,
          },
        },
      ])
      const update = makeCompositionUpdate(Message, [binding], false)({})
      const message = trackedMapper.toParentMessage(changedCount)

      expect(() => update({ count: 1 }, message)).toThrow(error)
      expect(binding.fold).not.toHaveBeenCalled()
    },
  )

  it('leaves the parent Model unchanged when the route resolves to None', () => {
    const binding = {
      placement: 'first',
      fold: vi.fn(),
    }
    const trackedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(binding, trackedMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: () => Option.none(),
      },
    })
    const update = makeCompositionUpdate(Message, [binding], false)({})
    const model = { count: 1 }

    expect(update(model, trackedMapper.toParentMessage(changedCount))).toEqual({
      model,
    })
    expect(binding.fold).not.toHaveBeenCalled()
  })

  it('runs the route resolver and fold inside the registered operation graph', () => {
    const binding = {
      placement: 'first',
      fold: (model: { count: number }, message: typeof changedCount) => {
        assertRegisteredBinding(binding, binding.placement)
        return { model: { count: model.count + message.amount } }
      },
    }
    const trackedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(binding, trackedMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => {
          assertRegisteredBinding(binding, binding.placement)
          return Option.some([childMessageOf(message)])
        },
      },
    })

    expect(
      makeCompositionUpdate(Message, [binding], false)({})(
        { count: 1 },
        trackedMapper.toParentMessage(changedCount),
      ),
    ).toEqual({ model: { count: 3 } })
  })

  it('stages an incomplete internal delivery table but rejects its unclaimed Got Message', () => {
    const firstBinding = { placement: 'first', fold: vi.fn() }
    const secondBinding = { placement: 'second', fold: vi.fn() }
    const firstMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    const secondMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(firstBinding, firstMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
    })
    registerBindingDelivery(secondBinding, secondMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
    })

    const update = makeCompositionUpdate(
      Message,
      [firstBinding, secondBinding],
      false,
    )({})

    expect(() =>
      update({ count: 1 }, firstMapper.toParentMessage(changedCount)),
    ).toThrow(
      '[foldkit] Composition.makeUpdate received Got* child wrapper "GotFirstMessage" without an owning Binding.',
    )
    expect(firstBinding.fold).not.toHaveBeenCalled()
    expect(secondBinding.fold).not.toHaveBeenCalled()
  })

  it('rejects a route claimed by one Binding and produced by another', () => {
    const routedBinding = { placement: 'first', fold: vi.fn() }
    const otherBinding = { placement: 'second', fold: vi.fn() }
    const routedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    const otherMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(routedBinding, routedMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    registerBindingDelivery(otherBinding, otherMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
    })

    expect(() =>
      makeCompositionUpdate(Message, [routedBinding, otherBinding], false),
    ).toThrow(
      'is routed to child Binding "first" but child Binding "second" also produces it',
    )
  })

  it('rejects two Bindings that claim the same incoming parent Message', () => {
    const firstBinding = { placement: 'first', fold: vi.fn() }
    const secondBinding = { placement: 'second', fold: vi.fn() }
    const firstMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    const secondMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotSecondMessage({ message }),
    )
    registerBindingDelivery(firstBinding, firstMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    registerBindingDelivery(secondBinding, secondMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })

    expect(() =>
      makeCompositionUpdate(Message, [firstBinding, secondBinding], false),
    ).toThrow('both claim parent Message "GotFirstMessage"')
  })

  it('rejects a reserved Message emitted through an arbitrary mapper from another Binding', () => {
    const routedBinding = { placement: 'first', fold: vi.fn() }
    const otherBinding = { placement: 'second', fold: vi.fn() }
    const routedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    const otherMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(routedBinding, routedMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    registerBindingDelivery(otherBinding, otherMapper, {})
    const update = makeCompositionUpdate(
      Message,
      [routedBinding, otherBinding],
      false,
    )({})

    expect(() =>
      update({ count: 1 }, otherMapper.toParentMessage(changedCount)),
    ).toThrow('was emitted by another child Binding')
  })

  it('allows the same mapper to reuse a parent Message object', () => {
    const result = { model: { count: 3 } }
    const binding = { placement: 'first', fold: vi.fn(() => result) }
    const sharedMessage = Message.GotFirstMessage({ message: changedCount })
    const trackedMapper = trackParentMessageMapper(() => sharedMessage)
    registerBindingDelivery(binding, trackedMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    const update = makeCompositionUpdate(Message, [binding], false)({})

    trackedMapper.toParentMessage()
    trackedMapper.toParentMessage()

    expect(update({ count: 1 }, sharedMessage)).toBe(result)
    expect(binding.fold).toHaveBeenCalledWith({ count: 1 }, changedCount)
  })

  it('retains ambiguity when multiple mappers return the same object', () => {
    const binding = { placement: 'first', fold: vi.fn() }
    const otherBinding = { placement: 'second', fold: vi.fn() }
    const sharedMessage = Message.GotFirstMessage({ message: changedCount })
    const trackedMapper = trackParentMessageMapper(() => sharedMessage)
    const otherMapper = trackParentMessageMapper(() => sharedMessage)
    registerBindingDelivery(binding, trackedMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    registerBindingDelivery(otherBinding, otherMapper, {})
    const update = makeCompositionUpdate(
      Message,
      [binding, otherBinding],
      false,
    )({})

    trackedMapper.toParentMessage()
    otherMapper.toParentMessage()
    trackedMapper.toParentMessage()

    expect(() => update({ count: 1 }, sharedMessage)).toThrow(
      'was emitted by another child Binding',
    )
  })

  it('delegates unclaimed Messages to the authored update', () => {
    const binding = { placement: 'first', fold: vi.fn() }
    const trackedMapper = trackParentMessageMapper(
      (message: typeof changedCount) => Message.GotFirstMessage({ message }),
    )
    registerBindingDelivery(binding, trackedMapper, {
      fromParentMessage: {
        parentMessage: Message.GotFirstMessage,
        args: (_model, message) => Option.some([childMessageOf(message)]),
      },
    })
    const authoredUpdate = vi.fn((model: { count: number }) => ({
      model: { count: model.count + 1 },
    }))
    const update = makeCompositionUpdate(
      Message,
      [binding],
      false,
    )({ ClickedReset: authoredUpdate })
    const message = Message.ClickedReset()

    expect(update({ count: 1 }, message)).toEqual({ model: { count: 2 } })
    expect(authoredUpdate).toHaveBeenCalledWith({ count: 1 }, message)
  })

  it('rejects callback authoring at runtime', () => {
    const makeUpdate = makeCompositionUpdate(Message, [], false)

    expect(() =>
      Reflect.apply(makeUpdate, undefined, [
        (model: { count: number }) => ({ model }),
      ]),
    ).toThrow('requires an exhaustive handler record')
  })
})
