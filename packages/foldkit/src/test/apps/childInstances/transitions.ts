import { Array, Number } from 'effect'

import { CountersBinding } from './composition.js'
import { makeFieldsStep } from './definition.js'

export const addCounter = (key: string, count: number) =>
  makeFieldsStep(() => ({
    counters: Array.append(CountersBinding.create({ key, args: [count] })),
  }))

export const summarizeCounters = makeFieldsStep(model => ({
  summary: () =>
    Array.reduce(
      model.counters,
      0,
      (sum, counter) => sum + counter.model.count,
    ),
}))

export const incrementSummary = makeFieldsStep(() => ({
  summary: Number.increment,
}))
