import { Array, Option, Schema } from 'effect'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { defineMessageUnion } from '../schema/index.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'
import {
  makeCompositionUpdate,
  registerBindingDelivery,
  trackParentMessageMapper,
} from './delivery.js'
import { assertRegisteredBinding } from './operationGraph.js'

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
    const ContextualChild = define('DeliveryContextualChild', {
      Model: ContextualChildModel,
      Message: ContextualChildMessage,
    })
    const contextualComposition = ContextualChild.makeComposition()
    const contextualBlock = contextualComposition.makeBlock({
      init: contextualComposition.makeInit(() => ({
        model: ContextualChildModel.make({ count: 0 }),
      })),
      update: contextualComposition.makeUpdate(
        (model, _message, _context: Readonly<{ source: 'Required' }>) => ({
          model,
        }),
      ),
    })
    const ContextualParentModel = Schema.Struct({
      child: ContextualChildModel,
    })
    const ContextualParentMessage = defineMessageUnion({
      GotChildMessage: { message: ContextualChildMessage },
    })
    const ContextualParent = define('DeliveryContextualParent', {
      Model: ContextualParentModel,
      Message: ContextualParentMessage,
    })

    expect(contextualBlock.update.length).toBe(2)
    expect(() =>
      Reflect.apply(ContextualParent.bindChild, undefined, [
        contextualBlock,
        {
          field: 'child',
          parentMessage: ContextualParentMessage.GotChildMessage,
        },
      ]),
    ).toThrow(
      'A custom, keyed, or contextual Binding must supply fromParentMessage',
    )
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
    const update = makeCompositionUpdate([binding])()
    const model = { count: 1 }
    const message = trackedMapper.toParentMessage(changedCount)

    const result = update(model, message)

    expect(binding.fold).toHaveBeenCalledWith(model, changedCount)
    expect(result).toBe(foldResult)
  })

  it('routes native keyed tuples through the real fold and ignores stale keys', () => {
    const CounterModel = Schema.Struct({ count: Schema.Number })
    const Counter = define('DeliveryCounter', {
      Model: CounterModel,
      Message: ChildMessage,
    })
    const CounterComposition = Counter.makeComposition()
    const counterBlock = CounterComposition.makeBlock({
      init: CounterComposition.makeInit(() => ({
        model: CounterModel.make({ count: 0 }),
      })),
      update: CounterComposition.makeUpdate(
        (model, message, context: Readonly<{ multiplier: number }>) => ({
          model: modifyFields(model, {
            count: count => count + message.amount * context.multiplier,
          }),
        }),
      ),
    })
    const CounterInstance = Schema.Struct({
      id: Schema.String,
      counter: CounterModel,
    })
    const ParentModel = Schema.Struct({
      counters: Schema.Array(CounterInstance),
      activeId: Schema.String,
      multiplier: Schema.Number,
    })
    const ParentMessage = defineMessageUnion({
      GotCounterMessage: { id: Schema.String, message: ChildMessage },
    })
    const Parent = define('DeliveryCounterParent', {
      Model: ParentModel,
      Message: ParentMessage,
    })
    const CounterBinding = Parent.bindChild(counterBlock, {
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
      toParentMessage: (id, message) =>
        ParentMessage.GotCounterMessage({ id, message }),
      fromParentMessage: {
        parentMessage: ParentMessage.GotCounterMessage,
        args: (model, { id, message }) => {
          expectTypeOf(model).toEqualTypeOf<typeof ParentModel.Type>()
          expectTypeOf(id).toEqualTypeOf<string>()
          expectTypeOf(message).toEqualTypeOf<typeof ChildMessage.Type>()

          return id === model.activeId
            ? Option.some([id, message, { multiplier: model.multiplier }])
            : Option.none()
        },
      },
    })
    const ParentComposition = Parent.makeComposition({
      childBindings: [CounterBinding],
    })
    const update = ParentComposition.makeUpdate()
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
    const activeUpdate = update(
      model,
      ParentMessage.GotCounterMessage({ id: 'active', message: changedCount }),
    )
    const staleUpdate = update(
      model,
      ParentMessage.GotCounterMessage({ id: 'stale', message: changedCount }),
    )

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
      const update = makeCompositionUpdate([binding])()
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
    const update = makeCompositionUpdate([binding])()
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
      makeCompositionUpdate([binding])()(
        { count: 1 },
        trackedMapper.toParentMessage(changedCount),
      ),
    ).toEqual({ model: { count: 3 } })
  })

  it('allows manual Bindings to produce the same parent Message variant', () => {
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
      fromParentMessage: false,
    })
    registerBindingDelivery(secondBinding, secondMapper, {
      outgoingParentMessage: Message.GotFirstMessage,
      fromParentMessage: false,
    })

    expect(() =>
      makeCompositionUpdate([firstBinding, secondBinding]),
    ).not.toThrow()
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
      fromParentMessage: false,
    })

    expect(() => makeCompositionUpdate([routedBinding, otherBinding])).toThrow(
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

    expect(() => makeCompositionUpdate([firstBinding, secondBinding])).toThrow(
      'both claim parent Message "GotFirstMessage"',
    )
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
    registerBindingDelivery(otherBinding, otherMapper, {
      fromParentMessage: false,
    })
    const update = makeCompositionUpdate([routedBinding, otherBinding])()

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
    const update = makeCompositionUpdate([binding])()

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
    registerBindingDelivery(otherBinding, otherMapper, {
      fromParentMessage: false,
    })
    const update = makeCompositionUpdate([binding, otherBinding])()

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
    const update = makeCompositionUpdate([binding])(authoredUpdate)
    const message = Message.ClickedReset()

    expect(update({ count: 1 }, message)).toEqual({ model: { count: 2 } })
    expect(authoredUpdate).toHaveBeenCalledWith({ count: 1 }, message)
  })
})
