import { Predicate } from 'effect'

import type * as Update from '../update/index.js'
import type { OperationEnvironment } from '../update/operationRecipe.js'
import { isRegisteredBinding } from './operationGraph.js'

declare const BindingInitRecipeTypeId: unique symbol

declare const BindingInitRecipeTypesTypeId: unique symbol

/**
 * A passive, noncallable child initialization recipe returned by
 * {@link BindingInitializer}. It retains the child init arguments, optional
 * keyed identity, parent Model constructor, appended parent Commands, and their
 * requirements without initializing the child eagerly.
 *
 * Return it intact from a matching Composition `makeInit` or `makeUpdate`
 * callback. A Definition-owned Step preserves or wraps it. An exposed Message
 * can reach an update branch that returns the recipe, and the completed
 * operation interprets that update result. The recipe exposes no `.model` or
 * `.commands` fields.
 */
export interface BindingInitRecipe<
  Model,
  Message,
  R,
  Evidence,
> extends Update.DeferredUpdateEvidence<Model, Message, R, Evidence> {
  readonly [BindingInitRecipeTypeId]: true
  readonly [BindingInitRecipeTypesTypeId]: readonly [
    Model,
    Message,
    R,
    Evidence,
  ]
}

/** @internal The erased runtime shape of a child initialization recipe. */
export interface AnyBindingInitRecipe {
  readonly [BindingInitRecipeTypeId]: true
  readonly [BindingInitRecipeTypesTypeId]: readonly [
    unknown,
    unknown,
    unknown,
    unknown,
  ]
}

const entries = new WeakMap<
  object,
  Readonly<{
    binding: object
    execute: (environment: OperationEnvironment | undefined) => unknown
  }>
>()

/** @internal Recovers the update return produced by an initialization recipe. */
export type BindingInitRecipeReturn<Recipe> =
  Recipe extends BindingInitRecipe<
    infer Model,
    infer Message,
    infer R,
    infer Evidence
  >
    ? Update.WithRegistrationEvidence<
        Update.Return<Model, Message, R>,
        Evidence
      >
    : never

/** @internal Constructs a passive child initialization recipe. */
export const makeBindingInitRecipe = (
  binding: object,
  execute: (environment: OperationEnvironment | undefined) => unknown,
): AnyBindingInitRecipe => {
  const recipe: object = Object.freeze(Object.create(null))
  entries.set(recipe, { binding, execute })
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return recipe as AnyBindingInitRecipe
}

/** @internal Checks whether an authoring result is a child initialization recipe. */
export const isBindingInitRecipe = (
  value: unknown,
): value is AnyBindingInitRecipe =>
  Predicate.isObject(value) && entries.has(value)

/** @internal Checks whether an initialization recipe owns an active Binding. */
export const isRegisteredBindingInitRecipe = (
  recipe: AnyBindingInitRecipe,
): boolean => {
  const entry = entries.get(recipe)
  return entry !== undefined && isRegisteredBinding(entry.binding)
}

/** @internal Executes a child initialization recipe in the active graph. */
export const runBindingInitRecipe = (
  recipe: AnyBindingInitRecipe,
  environment?: OperationEnvironment,
): unknown => {
  const entry = entries.get(recipe)
  if (entry === undefined) {
    throw new Error('[foldkit] Child initialization recipe is unavailable.')
  }
  return entry.execute(environment)
}
