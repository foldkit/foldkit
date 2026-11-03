import { Predicate } from 'effect'

import {
  type AuthoringSource,
  type Plan,
  type PlanKind,
  type RuntimeComposition,
  compilePlan,
  makePlan,
} from './authoring.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any

/** @internal Erased passive builder protocol shared by local and input composers. */
export interface RuntimePlanComposer {
  (...args: ReadonlyArray<unknown>): Plan<unknown, PlanKind, AuthoringSource>
  readonly withContext: (
    ...args: ReadonlyArray<unknown>
  ) => Plan<unknown, PlanKind, AuthoringSource>
  readonly cases: ((
    cases: object,
  ) => Plan<unknown, PlanKind, AuthoringSource>) &
    Readonly<{
      withContext: (
        factory: AnyFunction,
      ) => Plan<unknown, PlanKind, AuthoringSource>
    }>
  readonly each: (
    handler: AnyFunction,
  ) => Plan<unknown, PlanKind, AuthoringSource>
  readonly on: (
    tags: ReadonlyArray<string>,
  ) => (handler: AnyFunction) => Plan<unknown, PlanKind, AuthoringSource>
  readonly except: (
    tags: ReadonlyArray<string>,
  ) => (handler: AnyFunction) => Plan<unknown, PlanKind, AuthoringSource>
  readonly compose: (
    ...parts: ReadonlyArray<Plan<unknown, PlanKind, AuthoringSource>>
  ) => Plan<unknown, PlanKind, AuthoringSource>
}

/** @internal Reuses the same passive recipe adapter for both pure entry points. */
export const makeComposablePlanFactory = (
  composition: AuthoringSource,
  kind: 'Update' | 'InMessageUpdate',
  property: string,
): RuntimePlanComposer => {
  const updateOf = (
    actual: RuntimeComposition,
  ): AnyFunction & Readonly<{ withContext?: AnyFunction }> => {
    const update = Reflect.get(actual, property)
    if (!Predicate.isFunction(update)) {
      throw new Error(`[foldkit] Missing Composition.${property}.`)
    }
    return update
  }
  const invokeUpdateMethod = (
    actual: RuntimeComposition,
    name: string,
    args: ReadonlyArray<unknown>,
  ): unknown => {
    const method = Reflect.get(updateOf(actual), name)

    if (!Predicate.isFunction(method)) {
      throw new Error(`[foldkit] Missing Composition.makeUpdate.${name}.`)
    }

    return Reflect.apply(method, updateOf(actual), args)
  }
  const makeUpdatePart = (name: string, args: ReadonlyArray<unknown>) =>
    makePlan(composition, kind, actual =>
      invokeUpdateMethod(actual, name, args),
    )
  const makeUpdate = Object.assign(
    (...args: ReadonlyArray<unknown>) =>
      makePlan(composition, kind, actual => updateOf(actual)(...args)),
    {
      withContext: (...args: ReadonlyArray<unknown>) =>
        makePlan(composition, kind, actual => {
          const withContext = updateOf(actual).withContext
          if (withContext === undefined) {
            throw new Error(
              '[foldkit] This Composition has no contextual update authoring.',
            )
          }

          return withContext(...args)
        }),
      cases: Object.assign(
        (cases: object) => makeUpdatePart('cases', [cases]),
        {
          withContext: (createCases: AnyFunction) =>
            makePlan(composition, kind, actual => {
              const cases = Reflect.get(updateOf(actual), 'cases')
              const withContext = Predicate.isFunction(cases)
                ? Reflect.get(cases, 'withContext')
                : undefined

              if (!Predicate.isFunction(withContext)) {
                throw new Error(
                  '[foldkit] Missing Composition.makeUpdate.cases.withContext.',
                )
              }

              return Reflect.apply(withContext, cases, [createCases])
            }),
        },
      ),
      each: (handler: AnyFunction) => makeUpdatePart('each', [handler]),
      on: (tags: ReadonlyArray<string>) => (handler: AnyFunction) =>
        makeUpdatePart('on', [tags, handler]),
      except: (tags: ReadonlyArray<string>) => (handler: AnyFunction) =>
        makeUpdatePart('except', [tags, handler]),
      compose: (
        ...parts: ReadonlyArray<Plan<unknown, PlanKind, AuthoringSource>>
      ) =>
        makePlan(composition, kind, actual => {
          const compiled = parts.map(part =>
            compilePlan(part, actual, composition),
          )

          return invokeUpdateMethod(actual, 'compose', compiled)
        }),
    },
  )
  return makeUpdate
}
