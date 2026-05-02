import { Effect, Schema } from 'effect'

import type { MountResult } from '../html/index.js'

/** Type-level brand for MountDefinition values. */
/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
export const MountDefinitionTypeId: unique symbol = Symbol.for(
  'foldkit/MountDefinition',
) as unknown as MountDefinitionTypeId

/** Type-level brand for MountDefinition values. */
export type MountDefinitionTypeId = typeof MountDefinitionTypeId

/** A named, type-constrained mount-time side effect with paired cleanup.
 *  Created by calling the function returned from `Mount.define`. The runtime
 *  invokes `f` with the live `Element` when the element mounts; the Effect
 *  resolves to a `{ message, cleanup }` record. The Message is dispatched and
 *  the cleanup is invoked automatically when the element unmounts. */
export type MountAction<Message, E = never> = Readonly<{
  name: string
  f: (element: Element) => Effect.Effect<MountResult<Message>, E>
}>

/** A Mount identity created with `Mount.define`. Call with a function returning
 *  an Effect that resolves to `{ message, cleanup }` to create a MountAction.
 *  The Effect must not require any services (R = never); errors are caught
 *  by the runtime. */
export interface MountDefinition<Name extends string, ResultMessage = any> {
  readonly [MountDefinitionTypeId]: MountDefinitionTypeId
  readonly name: Name;
  <
    Factory extends (
      element: Element,
    ) => Effect.Effect<MountResult<ResultMessage>, any, never>,
  >(
    f: Factory,
  ): Readonly<{
    name: Name
    f: Factory
  }>
}

/** Defines a named Mount identity with the Messages it can return. The returned
 *  Definition is callable: pass an `(element: Element) => Effect<MountResult<Message>>`
 *  to wrap it as a typed, named action that the `OnMount` attribute consumes. */
export const define: {
  <const Name extends string, Results extends ReadonlyArray<Schema.Top>>(
    name: Name,
    ...results: Results
  ): MountDefinition<Name, Schema.Schema.Type<Results[number]>>
} = <const Name extends string>(
  name: Name,
  ..._results: ReadonlyArray<Schema.Top>
): MountDefinition<Name, any> => {
  const create = (f: (element: Element) => Effect.Effect<any, any, any>) => ({
    name,
    f,
  })

  Object.defineProperty(create, 'name', { value: name, configurable: true })
  Object.defineProperty(create, MountDefinitionTypeId, {
    value: MountDefinitionTypeId,
  })

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return create as unknown as MountDefinition<Name, any>
}

/** Lifts a `MountAction` from one Message universe to another by mapping its
 *  dispatched Message through a transform. Used by Submodel components to
 *  emit lifecycle action results into the parent's Message union via the
 *  consumer-supplied `toParentMessage` lift. */
export const mapMessage: {
  <A, B>(
    f: (message: A) => B,
  ): <E>(action: MountAction<A, E>) => MountAction<B, E>
  <A, B, E>(action: MountAction<A, E>, f: (message: A) => B): MountAction<B, E>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
} = ((...args: ReadonlyArray<any>) =>
  args.length === 1
    ? (action: any) => ({
        name: action.name,
        f: (element: Element) =>
          action.f(element).pipe(
            Effect.map(({ message, cleanup }: any) => ({
              message: args[0](message),
              cleanup,
            })),
          ),
      })
    : {
        name: args[0].name,
        f: (element: Element) =>
          args[0].f(element).pipe(
            Effect.map(({ message, cleanup }: any) => ({
              message: args[1](message),
              cleanup,
            })),
          ),
      }) as any
