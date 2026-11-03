import type * as Command from 'foldkit/command'
import type * as Update from 'foldkit/update'

import type { PlanOutput } from '../../../packages/foldkit/src/experimental/hybrid/authoring.js'
import type { ChannelsOf, RowsOf } from './authoring.js'
import { Save, saveAfter, saveCases, secondEmitter } from './channels.js'
import {
  base as contextualBase,
  countCases,
  shared,
  updates as contextualUpdates,
} from './context.js'
import { pingChild, updates as graphUpdates } from './graph.js'
import {
  updates,
  baseUpdate,
  inputCases,
  labelCases,
  sharedRaw,
  selected,
} from './parts.js'

export const first = updates.compose(inputCases, sharedRaw)
export const second = updates.compose(labelCases, selected)
export const focused = updates.compose(first, second)
export const completed = updates.compose(focused, baseUpdate)
export const nestedCompleted = updates.compose(completed, focused)

export const commandBundle = updates.compose(saveAfter)
export const nestedCommands = updates.compose(
  commandBundle,
  updates.compose(labelCases),
)
export const completedCommands = updates.compose(baseUpdate, nestedCommands)

export const emittingBundle = updates.compose(saveCases)
export const nestedEmitter = updates.compose(
  emittingBundle,
  updates.compose(labelCases),
)
export const completedEmitter = updates.compose(baseUpdate, nestedEmitter)

// @ts-expect-error Nesting must not hide a competing emitter for ChangedCount.
updates.compose(nestedEmitter, secondEmitter)

// @ts-expect-error A completed nested group already contains its complete update anchor.
updates.compose(completed, baseUpdate)

export const graphBundle = graphUpdates.compose(pingChild)

// @ts-expect-error Focused bundles retain their original graph and Model ownership.
updates.compose(baseUpdate, graphBundle)

export const contextualBundle = contextualUpdates.compose(countCases, shared)
export const contextualCompleted = contextualUpdates.compose(
  contextualBundle,
  contextualBase,
)

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition
type AnyFunction = (...args: ReadonlyArray<any>) => any

export type BundleIsNotExecutable = Expect<
  PlanOutput<typeof focused> extends AnyFunction ? false : true
>
export type CompleteIsExecutable = Expect<
  PlanOutput<typeof completed> extends AnyFunction ? true : false
>
export type NestedRowsEqual = Expect<
  Equal<RowsOf<typeof completed>, RowsOf<typeof nestedCompleted>>
>
export type RequirementsSurviveNesting = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof completedCommands>>,
    Command.HandlerOf<typeof Save>
  >
>
export type EmissionSurvivesNesting = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof completedEmitter>>,
      readonly ['ChangedCount', unknown, unknown, unknown]
    >,
    RowsOf<typeof saveCases>
  >
>
export type RegistrationSurvivesNesting = Expect<
  Equal<RowsOf<typeof graphBundle>[3], RowsOf<typeof pingChild>[3]>
>
export type ContextSurvivesNesting = Expect<
  Equal<
    Parameters<PlanOutput<typeof contextualCompleted>>,
    Parameters<PlanOutput<typeof contextualBase>>
  >
>
