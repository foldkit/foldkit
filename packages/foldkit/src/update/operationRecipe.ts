import { Predicate } from 'effect'

import type {
  AnyResultRecipe,
  ResolvedOperationOutput,
  ResultRecipeFor,
  ResultRecipeModel,
  ResultRecipeOutput,
} from './update.js'

/** @internal Immutable connections selected while constructing one executable graph. */
export type OperationEnvironment = ReadonlyMap<object, object>

type RecipeExecutor = (
  model: unknown,
  environment: OperationEnvironment | undefined,
) => unknown

const executors = new WeakMap<object, RecipeExecutor>()

/** @internal Constructs a passive operation recipe. */
export const makeResultRecipe = <Model, Output>(
  execute: (
    model: Model,
    environment: OperationEnvironment | undefined,
  ) => Output,
): ResultRecipeFor<Model, Output> => {
  const recipe = Object.freeze(Object.create(null))
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  executors.set(recipe, execute as RecipeExecutor)
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
  environment?: OperationEnvironment,
): ResultRecipeOutput<Recipe> => {
  const execute = executors.get(recipe)
  if (execute === undefined) {
    throw new Error('[foldkit] Operation recipe is unavailable.')
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return execute(model, environment) as ResultRecipeOutput<Recipe>
}

/** @internal Rejects a deferred Step where execution requires its result. */
export const assertResolvedStep = (value: unknown): void => {
  if (Predicate.isFunction(value)) {
    throw new Error(
      '[foldkit] A Step returned another Step instead of its result. Pass the Step directly to Update.combineSteps, apply it to the current Model, or author deferred composition through Definition.makeStep.',
    )
  }
}

/** @internal Resolves nested passive operations in the active graph. */
export const resolveOperationOutput = <Value>(
  value: Value,
  model: Value extends AnyResultRecipe ? ResultRecipeModel<Value> : unknown,
  environment?: OperationEnvironment,
): ResolvedOperationOutput<Value> => {
  if (value !== null && typeof value === 'object' && 'model' in value) {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return value as ResolvedOperationOutput<Value>
  }

  let current: unknown = value
  while (isResultRecipe(current)) {
    current = runResultRecipe(current, model, environment)
  }
  assertResolvedStep(current)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return current as ResolvedOperationOutput<Value>
}
