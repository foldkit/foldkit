import { Context, Effect, Layer, Option, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Subscription from '../subscription/subscription.js'
import * as Scene from '../test/scene.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

class Clock extends Context.Service<Clock, Readonly<{ now: number }>>()(
  'SubscriptionRegistryClock',
) {}

class Logger extends Context.Service<Logger, Readonly<{ write: () => void }>>()(
  'SubscriptionRegistryLogger',
) {}

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ Ticked: {}, Logged: {} })
type Message = typeof Message.Type
const RegistryDefinition = makeDefinition('SubscriptionRegistry', {
  Model,
  Message,
})

const subscriptions = RegistryDefinition.makeSubscriptions(entry => ({
  clock: entry('Clock', {
    messages: [Message.Ticked],
    handler: function* () {
      yield* Clock
      yield* Effect.fail<'ClockUnavailable'>('ClockUnavailable')
      return () => Stream.empty
    },
  }),
  logger: entry('Logger', {
    messages: [Message.Logged],
    handler: function* () {
      yield* Logger
      yield* Effect.fail<'LoggerUnavailable'>('LoggerUnavailable')
      return () => Stream.empty
    },
  }),
}))

const RegistryComposition = RegistryDefinition.makeComposition()
const prepareBlock = () =>
  RegistryComposition.prepareBlock({
    init: RegistryComposition.makeInit(() => ({
      model: Model.make({ count: 0 }),
    })),
    update: RegistryComposition.makeUpdate({
      Ticked: model => ({ model }),
      Logged: model => ({ model }),
    }),
    subscriptions,
    EffectsLayer: subscriptions.layer,
  })
const block: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareBlock
> = Block.assemble(prepareBlock)

describe('Definition subscriptions registry', () => {
  it('assembles an exact nonenumerable Layer when every entry is attached', () => {
    type ExpectedHandlers =
      | Subscription.HandlerOf<typeof subscriptions.clock>
      | Subscription.HandlerOf<typeof subscriptions.logger>

    expectTypeOf<
      Layer.Success<typeof subscriptions.layer>
    >().toEqualTypeOf<ExpectedHandlers>()
    expectTypeOf<Layer.Error<typeof subscriptions.layer>>().toEqualTypeOf<
      'ClockUnavailable' | 'LoggerUnavailable'
    >()
    expectTypeOf<Layer.Services<typeof subscriptions.layer>>().toEqualTypeOf<
      Clock | Logger
    >()
    expectTypeOf<
      Layer.Success<typeof block.EffectsLayer>
    >().toEqualTypeOf<ExpectedHandlers>()
    expectTypeOf<Layer.Error<typeof block.EffectsLayer>>().toEqualTypeOf<
      'ClockUnavailable' | 'LoggerUnavailable'
    >()
    expectTypeOf<Layer.Services<typeof block.EffectsLayer>>().toEqualTypeOf<
      Clock | Logger
    >()

    expect(Object.keys(subscriptions)).toEqual(['clock', 'logger'])
    expect(
      Object.getOwnPropertyDescriptor(subscriptions, 'layer'),
    ).toMatchObject({ enumerable: false })
  })

  it('normalizes owned registries at aggregate, lift, and Block boundaries', () => {
    const aggregated = Subscription.aggregate(subscriptions)
    const lifted = Subscription.lift(subscriptions)<
      Readonly<{ child: Model }>,
      Message
    >({
      read: model => Option.some(model.child),
      toParentMessage: message => message,
    })

    expectTypeOf<keyof typeof aggregated>().toEqualTypeOf<'clock' | 'logger'>()
    expectTypeOf<keyof typeof lifted>().toEqualTypeOf<'clock' | 'logger'>()
    expectTypeOf<keyof typeof block.subscriptions>().toEqualTypeOf<
      'clock' | 'logger'
    >()
    expect(Object.keys(aggregated)).toEqual(['clock', 'logger'])
    expect(Object.keys(lifted)).toEqual(['clock', 'logger'])
    expect(Object.keys(block.subscriptions)).toEqual(['clock', 'logger'])

    Scene.scene(
      {
        update: (model: Model, _message: Message) => ({
          model,
        }),
        view: (_model, h) => h.div([]),
        subscriptions,
      },
      Scene.given(Model.make({ count: 0 })),
      Scene.Subscription.emit(subscriptions.clock, Message.Ticked()),
    )
  })

  it('adds Layer.empty to an empty registry and omits layer for mixed ownership', () => {
    const empty = RegistryDefinition.makeSubscriptions(() => ({}))
    const mixed = RegistryDefinition.makeSubscriptions(entry => ({
      attached: entry('Attached', {
        messages: [Message.Ticked],
        handler: function* () {
          return () => Stream.empty
        },
      }),
      hosted: entry('Hosted', { messages: [Message.Logged] }),
    }))

    expectTypeOf(empty.layer).toEqualTypeOf<Layer.Layer<never>>()
    expectTypeOf(mixed).not.toHaveProperty('layer')
    expect(Object.keys(empty)).toEqual([])
    expect(Object.getOwnPropertyDescriptor(empty, 'layer')).toMatchObject({
      enumerable: false,
    })
    expect('layer' in mixed).toBe(false)
  })

  it('decorates fresh registries when callbacks return frozen or sealed records', () => {
    const frozen = RegistryDefinition.makeSubscriptions(entry =>
      Object.freeze({
        clock: entry('FrozenClock', {
          messages: [Message.Ticked],
          handler: function* () {
            return () => Stream.empty
          },
        }),
      }),
    )
    const sealed = RegistryDefinition.makeSubscriptions(entry =>
      Object.seal({
        logger: entry('SealedLogger', {
          messages: [Message.Logged],
          handler: function* () {
            return () => Stream.empty
          },
        }),
      }),
    )

    expect(Object.isExtensible(frozen)).toBe(true)
    expect(Object.isExtensible(sealed)).toBe(true)
    expect(Layer.isLayer(frozen.layer)).toBe(true)
    expect(Layer.isLayer(sealed.layer)).toBe(true)
    expect(Object.keys(frozen)).toEqual(['clock'])
    expect(Object.keys(sealed)).toEqual(['logger'])
  })

  it('reserves layer as the aggregate recipe name', () => {
    expect(() =>
      RegistryDefinition.makeSubscriptions(entry => ({
        // @ts-expect-error Definition.makeSubscriptions reserves layer for its aggregate Layer.
        layer: entry('Conflicting', { messages: [Message.Ticked] }),
      })),
    ).toThrow(/reserves "layer"/u)
  })

  it('rejects an erased callback result that is not an entry record', () => {
    expect(() =>
      Reflect.apply(RegistryDefinition.makeSubscriptions, undefined, [
        () => undefined,
      ]),
    ).toThrow('callback must return a Subscription entry record')
    expect(() =>
      Reflect.apply(RegistryDefinition.makeSubscriptions, undefined, [
        () => [],
      ]),
    ).toThrow('callback must return a Subscription entry record')
  })

  it('rejects attached entries with invalid Layer values', () => {
    expect(() =>
      RegistryDefinition.makeSubscriptions(entry => ({
        broken: {
          ...entry('Broken', {
            messages: [Message.Ticked],
            handler: function* () {
              return () => Stream.empty
            },
          }),
          layer: 3,
        },
      })),
    ).toThrow(/entry "broken".*"layer".*Effect Layer/u)
  })
})
