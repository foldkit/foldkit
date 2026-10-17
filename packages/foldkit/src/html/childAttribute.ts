import { type Context, Predicate } from 'effect'

import type { MountAction } from '../mount/index.js'
import type { Attribute } from './index.js'
import {
  type DispatchSync,
  type MountDispatchResolver,
  requireBoundaryMappers,
  requireDispatch,
  requireMountDispatchResolver,
  requireRuntimeContext,
  requireUnmountResolver,
} from './runtimeSingleton.js'

const BRAND = '__childAttribute'

const isOnMountAttribute = (attribute: unknown): boolean =>
  Predicate.isTagged(attribute, 'OnMount')

type AttributeRequirements<Attribute> =
  Attribute extends Readonly<{
    _tag: 'OnMount'
    action: MountAction<infer _Message, infer _Error, infer Requirements>
  }>
    ? Requirements
    : never

type ChildAttributeValue<RequiredMountRequirements> =
  | Extract<
      Attribute<unknown, RequiredMountRequirements>,
      Readonly<{ _tag: 'OnMount' }>
    >
  | Readonly<{
      _tag: Exclude<Attribute<never>['_tag'], 'OnMount'>
    }>

/** An attribute carrying a handler that dispatches through a Block
 *  boundary's wrapping chain. Published by Blocks (typically Foldkit's
 *  `Ui.*` components) for a parent to spread into its own element
 *  attribute arrays. The parent does not know or care which child
 *  produced these; the runtime routes each handler through the
 *  originating Block's wrap chain at event-fire time.
 *
 *  `resolveUnmount` snapshots the boundary's wrapping chain at the time the
 *  group was published (child boundary alive) so `OnUnmount` can dispatch a
 *  root message from a destroy hook that fires after the boundary has been
 *  torn down. `boundaryMappers` snapshots the `toParentMessage` lifts
 *  (innermost first) for the Scene test harness. Groups containing `OnMount`
 *  also carry `resolveMountDispatch`, which binds the Mount to the acquiring
 *  render's dispatch owner while following that owner's current live wrappers.
 *
 *  Created via {@link childAttributes}. Element constructors accept
 *  `ChildAttribute` alongside `Attribute<Message>` in their attribute
 *  arrays. */
export type ChildAttribute<RequiredMountRequirements = never> = Readonly<{
  /** Identifies values created by {@link childAttributes}. */
  readonly [BRAND]: true
  /** Wrapped Attribute rendered by the receiving parent element. */
  readonly attribute: ChildAttributeValue<RequiredMountRequirements>
  /** Dispatcher captured from the originating Block boundary. */
  readonly dispatch: DispatchSync
  /** Captures an `OnUnmount` dispatch while the originating boundary exists. */
  readonly resolveUnmount: (message: unknown) => () => void
  /** Message wrappers retained for Scene test resolution. */
  readonly boundaryMappers: ReadonlyArray<(message: unknown) => unknown>
  /** Resolves the render-owned dispatcher for an `OnMount` Attribute. */
  readonly resolveMountDispatch?: MountDispatchResolver
  /**
   * Effect Context carrying the originating Block's Mount capability aliases.
   * @internal
   */
  readonly mountContext?: Context.Context<never>
}>

/** @internal Runtime shape shared by ChildAttributes of every capability. */
export type AnyChildAttribute = Readonly<{
  readonly [BRAND]: true
  readonly attribute: Readonly<{ _tag: string }>
  readonly dispatch: DispatchSync
  readonly resolveUnmount: (message: unknown) => () => void
  readonly boundaryMappers: ReadonlyArray<(message: unknown) => unknown>
  readonly resolveMountDispatch?: MountDispatchResolver
  readonly mountContext?: Context.Context<never>
}>

export const isChildAttribute = (value: unknown): value is AnyChildAttribute =>
  typeof value === 'object' && value !== null && BRAND in value

/** Captures the current boundary's dispatcher and wraps each attribute
 *  so handlers inside it route through that boundary's wrapping chain at
 *  event-fire time, even when the attribute is later spread into a
 *  parent's element in a different boundary.
 *
 *  Blocks call this when publishing attribute groups to a consumer's
 *  `toView` slot callback:
 *
 *  ```ts
 *  // Inside a BlockView running in the child's boundary:
 *  return viewInputs.toView({
 *    checkbox: childAttributes([
 *      h.OnClick(Toggled()),
 *      h.Role('checkbox'),
 *    ]),
 *    ...
 *  })
 *  ```
 *
 *  Without this binding step the consumer's element constructor would
 *  process `h.OnClick(Toggled())` using the parent's dispatcher (because
 *  the consumer's `toView` runs in the parent's boundary), bypassing the
 *  Block's `toParentMessage`. */
export const childAttributes = <
  const Attributes extends ReadonlyArray<Attribute<unknown, unknown>>,
>(
  attributes: Attributes,
): ReadonlyArray<ChildAttribute<AttributeRequirements<Attributes[number]>>> => {
  const dispatch = requireDispatch()
  const resolveUnmount = requireUnmountResolver()
  const boundaryMappers = requireBoundaryMappers()
  const resolveMountDispatch = attributes.some(isOnMountAttribute)
    ? requireMountDispatchResolver()
    : undefined
  const mountContext =
    resolveMountDispatch === undefined ? undefined : requireRuntimeContext()
  return attributes.map(
    attribute =>
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      ({
        [BRAND]: true,
        attribute,
        dispatch,
        resolveUnmount,
        boundaryMappers,
        ...(resolveMountDispatch !== undefined && { resolveMountDispatch }),
        ...(mountContext !== undefined && { mountContext }),
      }) as ChildAttribute<AttributeRequirements<Attributes[number]>>,
  )
}
