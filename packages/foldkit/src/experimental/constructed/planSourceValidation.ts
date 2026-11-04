import type { Plan, PlanKind, PlanSource } from '../hybrid/authoring.js'
import type { ConstructorBody, SourceOf } from './authoring.js'

type Equal<Left, Right> = [Left, Right] extends [Right, Left] ? true : false

type PlanSourcePairs<Value, ExpectedSource> = Value extends undefined
  ? never
  : Value extends Plan<unknown, PlanKind, unknown>
    ? readonly [expected: ExpectedSource, actual: PlanSource<Value>]
    : readonly [expected: ExpectedSource, actual: unknown]

type BodyPlanSourcePairs<
  Body extends ConstructorBody,
  Key extends 'update' | 'view' | 'inMessageUpdate',
> = Body extends unknown
  ? Key extends keyof Body
    ? PlanSourcePairs<Body[Key], SourceOf<Body>>
    : never
  : never

type IncompatibleSourcePair<Pair> = Pair extends readonly [unknown, unknown]
  ? 0 extends 1 & Pair[1]
    ? true
    : unknown extends Pair[1]
      ? true
      : Equal<Pair[0], Pair[1]> extends true
        ? never
        : true
  : never

type IncompatibleBodyPlanSource<
  Body extends ConstructorBody,
  Key extends 'update' | 'view' | 'inMessageUpdate',
> = IncompatibleSourcePair<BodyPlanSourcePairs<Body, Key>>

/** @internal Checks exact InMessage ownership before projecting operation contracts. */
export type InMessagePlanSourceValidation<Body extends ConstructorBody> = [
  IncompatibleBodyPlanSource<Body, 'inMessageUpdate'>,
] extends [never]
  ? readonly []
  : readonly [inMessageUpdateBelongsToAnotherComposition: never]

/** @internal Preserves each constructor alternative's exact portable plan ownership. */
export type PlanSourceValidation<Body extends ConstructorBody> = [
  IncompatibleBodyPlanSource<Body, 'update'>,
] extends [never]
  ? [IncompatibleBodyPlanSource<Body, 'view'>] extends [never]
    ? readonly []
    : readonly [viewBelongsToAnotherComposition: never]
  : readonly [updateBelongsToAnotherComposition: never]
