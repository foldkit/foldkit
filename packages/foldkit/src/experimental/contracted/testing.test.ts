import { Effect, Schema, Stream } from 'effect'
import { describe, expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import { defineMessageUnion } from '../../message/index.js'
import { modifyFields } from '../../struct/index.js'
import { withBlock } from '../layered/testing/withBlock.js'
import { type FactsOf, makeDefinition } from './public.js'

const Model = Schema.Struct({ value: Schema.String })
const Message = defineMessageUnion({
  ReceivedFirst: { text: Schema.String },
  ReceivedSecond: { count: Schema.Number },
})
export const ContractImplementationSubscriptionsKey = Symbol(
  'ContractImplementationSubscriptions',
)
const Definition = makeDefinition('ContractImplementationSubscriptions', {
  key: ContractImplementationSubscriptionsKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
})
const Composition = Definition.makeComposition()
const init = Composition.makeInit(() => ({ model: { value: '' } }))
const update = Composition.makeUpdate({
  ReceivedFirst: (model, { text }) => ({
    model: modifyFields(model, { value: () => text }),
  }),
  ReceivedSecond: (model, { count }) => ({
    model: modifyFields(model, { value: () => `${count}` }),
  }),
})
const firstSubscriptions = Definition.makeSubscriptions(entry => ({
  first: entry(
    'FirstImplementation',
    { text: Schema.String },
    {
      messages: [Message.ReceivedFirst],
      modelToDependencies: model => ({ text: model.value }),
      handler: function* () {
        return () => Stream.empty
      },
    },
  ),
}))
const secondSubscriptions = Definition.makeSubscriptions(entry => ({
  second: entry(
    'SecondImplementation',
    { count: Schema.Number },
    {
      messages: [Message.ReceivedSecond],
      modelToDependencies: () => ({ count: 0 }),
      handler: function* () {
        return () => Stream.empty
      },
    },
  ),
}))
const FirstBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    subscriptions: firstSubscriptions,
    EffectsLayer: firstSubscriptions.layer,
  }),
)
const SecondBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    subscriptions: secondSubscriptions,
    EffectsLayer: secondSubscriptions.layer,
  }),
)

describe('selected implementation Subscription tests', () => {
  it.effect(
    'exposes exact local registry facts without adding them to the independent contract',
    () => {
      expectTypeOf<
        keyof FactsOf<typeof Definition.contract>['subscriptions']
      >().toEqualTypeOf<never>()

      return withBlock(FirstBlock, block => {
        expectTypeOf<
          keyof typeof block.subscriptions
        >().toEqualTypeOf<'first'>()
        expectTypeOf(block.subscriptions.first.messages).toEqualTypeOf<
          readonly [typeof Message.ReceivedFirst]
        >()

        expectTypeOf<
          Stream.Services<
            ReturnType<typeof block.subscriptions.first.dependenciesToStream>
          >
        >().toEqualTypeOf<
          Stream.Services<
            ReturnType<typeof firstSubscriptions.first.dependenciesToStream>
          >
        >()
        expect(Object.keys(block.subscriptions)).toEqual(['first'])
        expect(block.subscriptions.first).toBe(firstSubscriptions.first)
      })
    },
  )

  it.effect(
    'selects its own implementation despite an outer provider for the same contract',
    () => {
      return withBlock(FirstBlock, block => {
        expect(Object.keys(block.subscriptions)).toEqual(['first'])
        expect(block.subscriptions.first).toBe(firstSubscriptions.first)
      }).pipe(Effect.provide(SecondBlock.layer))
    },
  )

  it.effect(
    'retains selected evidence through ordinary dependency provisioning',
    () => {
      const ProvidedBlock = FirstBlock.provide(SecondBlock.layer)

      return withBlock(ProvidedBlock, block => {
        expectTypeOf<
          keyof typeof block.subscriptions
        >().toEqualTypeOf<'first'>()
        expect(block.subscriptions.first).toBe(firstSubscriptions.first)
      })
    },
  )

  it('rejects an unregistered structural copy carrying another implementation Layer', async () => {
    const forged = { ...FirstBlock, layer: SecondBlock.layer }

    await expect(
      Effect.runPromise(withBlock(forged, () => undefined)),
    ).rejects.toThrow('original registered Block implementation')
  })
})
