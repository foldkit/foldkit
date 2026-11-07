import { Array, Effect, Schema } from 'effect'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import { makeDefinition } from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/index.js'
import * as Story from '../../../story/public.js'
import type * as Update from '../../../update/index.js'
import { CountersBinding } from './composition.js'
import {
  CounterBlock,
  layer as CounterLayer,
  CounterSource,
  initializationCounts,
} from './counter.js'

const Model = Schema.Struct({
  counters: Schema.Array(CounterBlock.Instance),
  history: Schema.Array(Schema.Unknown),
})
const Message = defineMessageUnion({
  ClickedRecord: { value: Schema.Unknown },
  ClickedAddCounter: { key: Schema.String, count: Schema.Number },
})
const ApplicationKey = Symbol('OccurrenceDataBoundary')
const ApplicationDefinition = makeDefinition('OccurrenceDataBoundary', {
  key: ApplicationKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects: { services: [CounterSource] },
})
const { makeFieldsStep } = ApplicationDefinition
const MixedCountersBinding = ApplicationDefinition.makeKeyedArrayBinding(
  CounterBlock,
  {
    field: 'counters',
    key: 'key',
    childField: 'model',
  },
).withOutMessagePolicy({ fold: () => ApplicationDefinition.makeNoopStep() })
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [MixedCountersBinding],
})
const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const counters = yield* MixedCountersBinding

    return {
      children: [counters],
      init: ApplicationComposition.makeInit(() => ({
        model: { counters: [], history: [] },
      })),
      update: ApplicationComposition.makeUpdate({
        ClickedRecord: makeFieldsStep.fromMessage(({ value }) => ({
          history: Array.append(value),
        })),
        ClickedAddCounter: makeFieldsStep.fromMessage(({ key, count }) => ({
          counters: Array.append(
            MixedCountersBinding.create({ key, args: [count] }),
          ),
        })),
      }),
    }
  }),
).provide(CounterLayer)

it.effect(
  'treats a token in an ordinary unknown-valued field as data across later creation',
  () =>
    Story.withBlock(ApplicationBlock, executable => {
      initializationCounts.length = 0
      const opaqueData = CountersBinding.create({ key: 'opaque', args: [99] })
      const initial = executable.init()
      const recorded = executable.update(
        initial.model,
        Message.ClickedRecord({ value: opaqueData }),
      )

      expect(recorded.model.history).toEqual([opaqueData])
      expect(recorded.commands).toBeUndefined()
      expect(initializationCounts).toEqual([])

      const added = executable.update(
        recorded.model,
        Message.ClickedAddCounter({ key: 'ready', count: 4 }),
      )

      expect(added.model.history).toBe(recorded.model.history)
      expect(added.model.counters).toEqual([
        { key: 'ready', model: { count: 4 } },
      ])
      expect(initializationCounts).toEqual([4])
    }),
)

it.effect(
  'keeps known tokens stored as ordinary data Model-only in types and execution',
  () =>
    Story.withBlock(ApplicationBlock, executable => {
      const opaqueData = CountersBinding.create({ key: 'opaque', args: [99] })
      const recordData = makeFieldsStep(() => ({ history: () => [opaqueData] }))
      const recorded = recordData(executable.init().model)

      expectTypeOf<
        Update.RequirementsOf<typeof recordData>
      >().toEqualTypeOf<never>()
      expect(recorded.model.history).toEqual([opaqueData])
      expect(recorded.commands).toBeUndefined()
    }),
)
