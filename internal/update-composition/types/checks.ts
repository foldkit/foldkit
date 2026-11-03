import { modifyFields } from 'foldkit/struct'

import type {
  CompositionContext,
  CompositionSource,
  RowsOf,
} from './authoring.js'
import { ApplicationComposition } from './domain.js'
import type { Model, Message } from './domain.js'
import { baseUpdate, inputCases, labelCases, updates } from './parts.js'

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type SourceIsExact = Expect<
  Equal<
    CompositionSource<typeof ApplicationComposition>['Model']['Type'],
    { readonly count: number; readonly label: string }
  >
>
export type DefaultContext = Expect<
  Equal<CompositionContext<typeof ApplicationComposition>, readonly []>
>
export type CountRow = Expect<
  Equal<
    RowsOf<typeof inputCases>,
    readonly ['ChangedCount', never, never, never]
  >
>
export type LabelRow = Expect<
  Equal<
    RowsOf<typeof labelCases>,
    readonly ['ChangedLabel', never, never, never]
  >
>

updates.cases({
  ChangedCount: (_model, message) => {
    // @ts-expect-error The exact ChangedCount payload has no label.
    const invalid = message.label
    return { model: { count: message.count, label: String(invalid) } }
  },
})

updates.each((model, message, { before }) => {
  // @ts-expect-error A shared Message is the complete union.
  const count = message.count
  // @ts-expect-error The snapshot retains the exact Model.
  const missing = before.missing
  return {
    model: modifyFields(model, {
      label: () => String(count) + String(missing),
    }),
  }
})

updates.cases({
  // @ts-expect-error A local record cannot invent a Message tag.
  MissingMessage: model => ({ model }),
})

// @ts-expect-error Shared stages must preserve the complete owning Model.
updates.each(() => ({ model: { count: 1 } }))

// @ts-expect-error Shared stages cannot emit an OutMessage.
updates.each(model => ({ model, outMessage: { _tag: 'Saved', count: 1 } }))

export const incompleteBundle = updates.compose(inputCases, labelCases)

// @ts-expect-error Two complete updates cannot route the same child twice.
updates.compose(baseUpdate, baseUpdate)

// @ts-expect-error Composition requires at least one part.
updates.compose()

// @ts-expect-error Explicit routing stages are not part of the authoring API.
updates.routeChildren()

updates.on(['ChangedCount'])((model, message) => {
  // @ts-expect-error Selection narrows to ChangedCount.
  const invalid = message.label
  return { model: modifyFields(model, { label: () => String(invalid) }) }
})

updates.except(['ChangedCount'])((model, message) => {
  // @ts-expect-error Exclusion removes ChangedCount.
  const invalid = message.count
  return { model: modifyFields(model, { label: () => String(invalid) }) }
})

// @ts-expect-error Selectors can name only declared local tags.
updates.on(['MissingMessage'])(model => ({ model }))

const alwaysThrows = () => {
  throw new Error('Unreachable shared stage')
}

// @ts-expect-error A never-returning callback does not supply checked result channels.
updates.each(alwaysThrows)

// @ts-expect-error A single-tag selection cannot erase a never-returning callback.
updates.on(['ChangedCount'])(alwaysThrows)

declare const erasedStep: (model: Model) => any

// @ts-expect-error A returned Step cannot erase its result channels.
updates.each(() => erasedStep)

// @ts-expect-error A single-tag selection cannot erase a returned Step's channels.
updates.on(['ChangedCount'])(() => erasedStep)

updates.each(
  // @ts-expect-error Shared callbacks must accept the complete selected Message domain.
  (model, _message: Extract<Message, { readonly _tag: 'ChangedCount' }>) => ({
    model,
  }),
)
