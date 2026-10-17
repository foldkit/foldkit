import { Predicate } from 'effect'

import type {
  AnyResultRecipe,
  ResolvedOperationOutput,
  ResultRecipeFor,
  ResultRecipeModel,
  ResultRecipeOutput,
} from './update.js'

const executors = new WeakMap<object, (model: unknown) => unknown>()

/** @internal Constructs a passive operation recipe. */
export const makeResultRecipe = <Model, Output>(
  execute: (model: Model) => Output,
): ResultRecipeFor<Model, Output> => {
  const recipe = Object.freeze(Object.create(null))
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  executors.set(recipe, execute as (model: unknown) => unknown)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return recipe as ResultRecipeFor<Model, Output>
}

/** @internal Checks whether a value is a passive operation recipe. */
export const isResultRecipe = (value: unknown): value is AnyResultRecipe =>
  Predicate.isObject(value) && executors.has(value)

/** @internal Interprets a passive operation in an active registered graph. */
export const runResultRecipe = <Recipe extends AnyResultRecipe>(
  recipe: Recipe,
  model: ResultRecipeModel<Recipe>,
): ResultRecipeOutput<Recipe> => {
  const execute = executors.get(recipe)
  if (execute === undefined) {
    throw new Error('[foldkit] Operation recipe is unavailable.')
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return execute(model) as ResultRecipeOutput<Recipe>
}

/** @internal Resolves nested passive operations in the active graph. */
export const resolveOperationOutput = <Value>(
  value: Value,
  model: Value extends AnyResultRecipe ? ResultRecipeModel<Value> : unknown,
): ResolvedOperationOutput<Value> => {
  if (value !== null && typeof value === 'object' && 'model' in value) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return value as ResolvedOperationOutput<Value>
  }

  let current: unknown = value
  while (isResultRecipe(current)) {
    current = runResultRecipe(current, model)
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return current as ResolvedOperationOutput<Value>
}
