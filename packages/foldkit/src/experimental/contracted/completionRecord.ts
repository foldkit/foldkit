import type { Effect } from 'effect'

import type { ConstructorBody } from '../constructed/authoring.js'
import type { PlanSource } from '../hybrid/authoring.js'
import type { BindingAcquisition } from './contract.js'

/** @internal Distinguishes returned implementations from Effects carrying both plans. */
export type CustomConstructorFields =
  | Readonly<{ init?: never }>
  | Readonly<{ update?: never }>

/** @internal Portable implementation whose registered children are acquired automatically. */
export type ImplementationRecord = Omit<ConstructorBody, 'children'>

type RegisteredConnection<Binding> =
  Binding extends Readonly<{
    connect: (...args: ReadonlyArray<any>) => infer Connection
  }>
    ? Connection
    : never

/** @internal Adds each alternative's own exact registered connections before completion. */
export type AcquiredConstructorBody<Body extends ImplementationRecord> =
  Body extends unknown
    ? Body &
        Readonly<{
          children: ReadonlyArray<
            RegisteredConnection<PlanSource<Body['init']>['bindings'][number]>
          >
        }>
    : never

/** @internal Retains child construction errors and dependencies without executing init. */
export type RecordAcquisition<Body extends ImplementationRecord> =
  BindingAcquisition<PlanSource<Body['init']>['bindings'][number]>

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never

/** @internal Keeps automatic acquisition distinct from explicit custom construction. */
export type ValidateImplementationRecord<Body> = [
  Extract<Body, Effect.Effect<any, any, any>>,
] extends [never]
  ? Extract<
      KeysOfUnion<Body>,
      'children' | 'bindings' | 'operations'
    > extends never
    ? unknown
    : never
  : never
