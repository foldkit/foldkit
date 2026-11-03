import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import { makeComposableUpdates, type CompositionContext } from './authoring.js'
import { Message, Model, OutMessage } from './domain.js'

export const ContextKey = Symbol('ContextualApplication')
export const ContextDefinition = Block.makeDefinition('ContextualApplication', {
  key: ContextKey,
  Model,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
  Context:
    Block.makeInputContract<
      readonly [
        timestamp: number,
        source?: string,
        ...trail: ReadonlyArray<string>,
      ]
    >(),
})

export const ContextComposition = ContextDefinition.makeComposition()
export const updates = makeComposableUpdates(ContextComposition)

export const countCases = updates.cases.withContext(
  (timestamp, source, ...trail) => ({
    ChangedCount: (model, { count }) => ({
      model: modifyFields(model, {
        count: () => count + timestamp,
        label: () => `${source ?? 'Local'}:${trail.join('/')}`,
      }),
    }),
  }),
)

export const shared = updates.each(
  (model, message, { before }, timestamp, source = 'Local', ...trail) => ({
    model: modifyFields(model, {
      label: () =>
        `${before.label}:${message._tag}:${timestamp}:${source}:${trail.join('/')}`,
    }),
  }),
)

export const base = updates.withContext(
  (timestamp, source = 'Local', ...trail) => ({
    ChangedCount: (model, { count }) => ({
      model: modifyFields(model, { count: () => count + timestamp }),
    }),
    ChangedLabel: (model, { label }) => ({
      model: modifyFields(model, {
        label: () => `${source}:${label}:${trail.join('/')}`,
      }),
    }),
    CompletedSave: model => ({ model }),
  }),
)

export const contextualUpdate = updates.compose(countCases, base, shared)

export const selectedWithContext = updates.on(['ChangedCount'])(
  (model, { count }, { before }, timestamp, source = 'Local', ...trail) => ({
    model: modifyFields(model, {
      count: () => count + timestamp,
      label: () => `${before.label}:${source}:${trail.join('/')}`,
    }),
  }),
)

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type ExactContext = Expect<
  Equal<
    CompositionContext<typeof ContextComposition>,
    readonly [
      timestamp: number,
      source?: string,
      ...trail: ReadonlyArray<string>,
    ]
  >
>

// @ts-expect-error The Context contract fixes timestamp to number.
updates.each((model, _message, _snapshot, timestamp: string) => ({
  model,
  timestamp,
}))

// @ts-expect-error The optional source cannot become required in a stage.
updates.each((model, _message, _snapshot, _timestamp, source: string) => ({
  model,
  source,
}))

updates.cases.withContext(
  // @ts-expect-error Context rest arguments remain string rather than number.
  (_timestamp, _source, ...trail: ReadonlyArray<number>) => ({
    ChangedCount: model => ({ model, trail }),
  }),
)

const requiredSource = updates.withContext(
  (_timestamp: number, source: string) => ({
    ChangedCount: model => ({
      model: modifyFields(model, { label: () => source.toUpperCase() }),
    }),
    ChangedLabel: model => ({
      model: modifyFields(model, { label: () => source.toUpperCase() }),
    }),
    CompletedSave: model => ({ model }),
  }),
)
const completeWithOptionalSource = updates.compose(base)
declare const selectedContext:
  | typeof requiredSource
  | typeof completeWithOptionalSource
// @ts-expect-error Every alternative must accept the declared optional Context.
updates.compose(selectedContext)
