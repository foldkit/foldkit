import type { PlanOutput } from '../../../packages/foldkit/src/experimental/hybrid/authoring.js'
import type { ChannelsOf } from './authoring.js'
import { makeFieldsStep } from './domain.js'
import {
  updates,
  baseUpdate,
  completionCases,
  inputCases,
  labelCases,
} from './parts.js'

const localCount = updates.cases({
  ChangedCount: makeFieldsStep((_model, { count }) => ({ count: () => count })),
})

export const inline = updates.compose(
  updates.cases({
    ChangedCount: makeFieldsStep((_model, { count }) => ({
      count: () => count,
    })),
  }),
  labelCases,
  completionCases,
  baseUpdate,
)

export const local = updates.compose(
  localCount,
  labelCases,
  completionCases,
  baseUpdate,
)
export const extracted = updates.compose(
  inputCases,
  labelCases,
  completionCases,
  baseUpdate,
)

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type LocalEqualsInline = Expect<
  Equal<
    ChannelsOf<PlanOutput<typeof local>>,
    ChannelsOf<PlanOutput<typeof inline>>
  >
>
export type ExtractedEqualsInline = Expect<
  Equal<
    ChannelsOf<PlanOutput<typeof extracted>>,
    ChannelsOf<PlanOutput<typeof inline>>
  >
>
