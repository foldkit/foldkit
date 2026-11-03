import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import type { PlanOutput } from '../../../packages/foldkit/src/experimental/hybrid/authoring.js'
import type { ChannelsOf, CompositionContext, RowsOf } from './authoring.js'
import {
  completedCommands,
  contextualCompleted,
  focused,
  graphBundle,
} from './bundles.js'
import {
  update,
  Save,
  Storage,
  saveCases,
  secondEmitter,
  completion,
  saveAfter,
} from './channels.js'
import { ContextComposition, contextualUpdate } from './context.js'
import { applyContextualConditional } from './contextGraph.js'
import type { Model, Message } from './domain.js'
import {
  appliedCanonicalBranch,
  EmittingChildBinding,
  emittingUpdates,
  ForeignBinding,
  pingChild,
  updates as graphUpdates,
} from './graph.js'
import { updates, baseUpdate, labelCases } from './parts.js'

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type CommandRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof update>>,
    Command.HandlerOf<typeof Save>
  >
>
export type SilentOtherTag = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['ChangedLabel', unknown, unknown, unknown]
    >,
    readonly ['ChangedLabel', never, never, never]
  >
>
export type HandlerStorage = Expect<
  Equal<import('effect').Layer.Services<typeof Save.layer>, Storage>
>
export const consumerUpdate = updates.compose(
  saveCases,
  labelCases,
  completion,
  baseUpdate,
)
export type FreshlyComposedRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof consumerUpdate>>,
    Command.HandlerOf<typeof Save>
  >
>
export type GroupedCommandRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof completedCommands>>,
    Command.HandlerOf<typeof Save>
  >
>
export type RawConditionalRegistration = Expect<
  Equal<RowsOf<typeof appliedCanonicalBranch>[3], RowsOf<typeof pingChild>[3]>
>
export type ContextualRawKeepsRegistration = Expect<
  [RowsOf<typeof applyContextualConditional>[3]] extends [never] ? false : true
>
export type ContextualGroupParameters = Expect<
  Equal<
    Parameters<PlanOutput<typeof contextualCompleted>>,
    Parameters<PlanOutput<typeof contextualUpdate>>
  >
>

export const externalFocusedBundle = updates.compose(saveAfter, labelCases)
export const externalGroupedUpdate = updates.compose(
  baseUpdate,
  externalFocusedBundle,
)
export type ExternalGroupingKeepsRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof externalGroupedUpdate>>,
    Command.HandlerOf<typeof Save>
  >
>

// @ts-expect-error Focused bundles have no executable update function before an anchor.
export const executeFocused: PlanOutput<typeof focused> extends (
  ...args: ReadonlyArray<any>
) => any
  ? true
  : never = true

// @ts-expect-error A focused child bundle retains its owning graph after emission.
updates.compose(baseUpdate, graphBundle)

// @ts-expect-error An unregistered operation remains rejected after emission.
graphUpdates.each(() => ForeignBinding.requestPing())

// @ts-expect-error Resolved parent policy OutMessages cannot enter silent shared stages.
emittingUpdates.each(() => EmittingChildBinding.requestPing())

// @ts-expect-error Shared stages retain exact Model validation after emission.
updates.each(() => ({ model: { count: 0 } }))
export type Context = Expect<
  Equal<
    CompositionContext<typeof ContextComposition>,
    readonly [
      timestamp: number,
      source?: string,
      ...trail: ReadonlyArray<string>,
    ]
  >
>

declare const executeContextual: PlanOutput<typeof contextualUpdate>
declare const model: Model
declare const message: Message
executeContextual(model, message, 1)
executeContextual(model, message, 1, 'Remote', 'Room', 'Editor')
executeContextual(message)(model, 1, undefined, 'Editor')

// @ts-expect-error Required Context is preserved after emission.
executeContextual(model, message)

// @ts-expect-error Rest Context is preserved after emission.
executeContextual(model, message, 1, 'Remote', 2)

updates.compose(
  // @ts-expect-error Same-tag OutMessage conflicts remain rejected after emission.
  saveCases,
  secondEmitter,
  labelCases,
  completion,
  baseUpdate,
)
