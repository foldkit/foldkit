import { Array, Effect, Option, Schema } from 'effect'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { resolveOccurrenceFields } from '../../../block/occurrenceRuntime.js'
import { withOperationGraph } from '../../../block/operationGraph.js'
import {
  acquisitionOf,
  executionBindingsOf,
} from '../../../experimental/constructed/symbolic.js'
import { resolveOperationOutput } from '../../../update/operationRecipe.js'
import { ApplicationBlock } from './block.js'
import { CountersBinding } from './composition.js'
import { initializationCounts } from './counter.js'
import { Message, Model, makeFieldsStep } from './definition.js'

type Executable = Effect.Success<typeof ApplicationBlock.get>

const withExecutable = (run: (executable: Executable) => void) =>
  Effect.scoped(
    Effect.flatMap(ApplicationBlock.get, executable =>
      Effect.sync(() => run(executable)),
    ).pipe(Effect.provide(ApplicationBlock.layer)),
  )

const environmentOf = (executable: Executable) => {
  const environment = executionBindingsOf(acquisitionOf(executable).block)

  if (environment === undefined) {
    throw new Error('The Counter application has no acquired Binding graph.')
  }

  return environment
}

const applyFields = (
  executable: Executable,
  model: Model,
  step: (model: Model) => unknown,
): unknown => {
  const environment = environmentOf(executable)

  return withOperationGraph([...environment.values()], () =>
    resolveOperationOutput(step(model), model, environment),
  )
}

it.effect(
  'snapshots inert creation arguments and initializes afresh for each application',
  () => {
    initializationCounts.length = 0
    const args: [number] = [4]
    const creation = CountersBinding.create({ key: 'first', args })
    const appendCounter = makeFieldsStep(() => ({
      counters: Array.append(creation),
    }))
    args.splice(0, 1, 99)
    expect(initializationCounts).toEqual([])
    expect(creation).not.toHaveProperty('model')

    return withExecutable(executable => {
      const initial = executable.init([])

      expect(
        applyFields(executable, initial.model, appendCounter),
      ).toMatchObject({
        model: { counters: [{ key: 'first', model: { count: 4 } }] },
        commands: [{ name: 'OccurrenceCounter["first"]/ReadCount' }],
      })
      expect(
        applyFields(executable, initial.model, appendCounter),
      ).toMatchObject({
        model: { counters: [{ key: 'first', model: { count: 4 } }] },
      })
      expect(initializationCounts).toEqual([4, 4])
    })
  },
)

it.effect(
  'validates duplicate and existing keys before invoking any child initializer',
  () =>
    withExecutable(executable => {
      initializationCounts.length = 0
      const initial = executable.init([])
      const duplicateCounters = makeFieldsStep(() => ({
        counters: () => [
          CountersBinding.create({ key: 'first', args: [4] }),
          CountersBinding.create({ key: 'first', args: [5] }),
        ],
      }))

      expect(() =>
        applyFields(executable, initial.model, duplicateCounters),
      ).toThrow('duplicate keys')
      expect(initializationCounts).toEqual([])

      const added = executable.update(
        initial.model,
        Message.ClickedAddCounter({ key: 'first', count: 4 }),
      )
      initializationCounts.length = 0
      const replaceCounter = makeFieldsStep(() => ({
        counters: () => [CountersBinding.create({ key: 'first', args: [5] })],
      }))

      expect(() =>
        applyFields(executable, added.model, replaceCounter),
      ).toThrow('cannot replace an existing occurrence key')
      expect(initializationCounts).toEqual([])
    }),
)

it.effect(
  'rejects foreign fields, forged entries and disconnected requests before child init',
  () =>
    withExecutable(executable => {
      initializationCounts.length = 0
      const initial = executable.init([])
      const creation = CountersBinding.create({ key: 'first', args: [4] })
      const environment = environmentOf(executable)
      const candidates = [
        { ...initial.model, counters: [creation, { ...creation }] },
        { ...initial.model, anotherField: [creation] },
        { ...initial.model, counters: [creation], summary: 'invalid' },
      ]

      for (const candidate of candidates) {
        expect(() =>
          withOperationGraph([...environment.values()], () =>
            resolveOccurrenceFields(candidate, initial.model, environment, [
              'counters',
              'anotherField',
            ]),
          ),
        ).toThrow(
          /ready child Models|another Model field|valid unchanged parent Model fields|requires a string key/,
        )
      }

      expect(() =>
        resolveOccurrenceFields(
          { ...initial.model, counters: [creation] },
          initial.model,
          new Map(),
          ['counters'],
        ),
      ).toThrow('original connected Binding')
      expect(initializationCounts).toEqual([])
    }),
)

it.effect(
  'preserves retained child identity and encodes only ready snapshot state',
  () =>
    withExecutable(executable => {
      const initial = executable.init([])
      const first = executable.update(
        initial.model,
        Message.ClickedAddCounter({ key: 'first', count: 4 }),
      )
      const firstCounter = Array.head(first.model.counters)
      const second = executable.update(
        first.model,
        Message.ClickedAddCounter({ key: 'second', count: 7 }),
      )

      expect(Array.head(second.model.counters)).toEqual(firstCounter)
      expect(Array.head(second.model.counters).pipe(Option.getOrThrow)).toBe(
        Array.head(first.model.counters).pipe(Option.getOrThrow),
      )

      const beforeDecode = [...initializationCounts]
      const codec = Schema.toCodecJson(Model)
      const encoded = Schema.encodeSync(codec)(second.model)

      expect(encoded).toEqual({
        counters: [
          { key: 'first', model: { count: 4 } },
          { key: 'second', model: { count: 7 } },
        ],
        summary: 0,
        lastChangedCount: 0,
      })
      expect(Schema.decodeSync(codec)(encoded)).toEqual(second.model)
      expect(initializationCounts).toEqual(beforeDecode)
    }),
)

it.effect(
  'defers startup creation until init and keeps every child init Command',
  () =>
    withExecutable(executable => {
      initializationCounts.length = 0
      const initial = executable.init([2, 8])

      expect(initializationCounts).toEqual([2, 8])
      expect(initial.model.counters).toEqual([
        { key: 'counter-0', model: { count: 2 } },
        { key: 'counter-1', model: { count: 8 } },
      ])
      expect(initial.commands).toHaveLength(2)
    }),
)
