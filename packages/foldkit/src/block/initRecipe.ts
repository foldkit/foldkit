import { Predicate } from 'effect'

import type * as Update from '../update/index.js'

declare const BindingInitRecipeTypeId: unique symbol

declare const BindingInitRecipeTypesTypeId: unique symbol

/**
 * A passive, noncallable child initialization recipe returned by
 * {@link BindingInitializer}. It retains the child init arguments, optional
 * keyed identity, parent Model constructor, appended parent Commands, and their
 * requirements without initializing the child eagerly.
 *
 * Return it intact from a matching Composition `makeInit` or `makeUpdate`
 * callback. A Definition-owned Step preserves or wraps it; a completed exposed
 * operation interprets a recipe preserved by its Step. The recipe exposes no
 * `.model` or `.commands` fields.
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

const executors = new WeakMap<object, () => unknown>()

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
  execute: () => unknown,
): AnyBindingInitRecipe => {
  const recipe: object = Object.freeze(Object.create(null))
  executors.set(recipe, execute)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return recipe as AnyBindingInitRecipe
}

/** @internal Checks whether an authoring result is a child initialization recipe. */
export const isBindingInitRecipe = (
  value: unknown,
): value is AnyBindingInitRecipe =>
  Predicate.isObject(value) && executors.has(value)

/** @internal Executes a child initialization recipe in the active graph. */
export const runBindingInitRecipe = (recipe: AnyBindingInitRecipe): unknown => {
  const execute = executors.get(recipe)
  if (execute === undefined) {
    throw new Error('[foldkit] Child initialization recipe is unavailable.')
  }
  return execute()
}
