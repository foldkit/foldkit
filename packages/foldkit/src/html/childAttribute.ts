import { Predicate } from 'effect'

import {
  type DispatchSync,
  type MountDispatchResolver,
  requireBoundaryMappers,
  requireDispatch,
  requireMountDispatchResolver,
  requireUnmountResolver,
} from './runtimeSingleton.js'

const BRAND = '__childAttribute'

declare const ChildAttributeTypeId: unique symbol

const isOnMountAttribute = (attribute: unknown): boolean =>
  Predicate.isTagged(attribute, 'OnMount')

/** An attribute carrying a handler that dispatches through a Submodel
 *  boundary's wrapping chain. Published by Submodels (typically Foldkit's
 *  `Ui.*` components) for a parent to spread into its own element
 *  attribute arrays. The parent does not know or care which child
 *  produced these; the runtime routes each handler through the
 *  originating Submodel's wrap chain at event-fire time.
 *
 *  Created via {@link childAttributes}. Element constructors accept
 *  `ChildAttribute` alongside `Attribute<Message>` in their attribute
 *  arrays. Opaque: a group can be spread into an attribute array, but its
 *  representation is not part of the API. */
export interface ChildAttribute {
  readonly [ChildAttributeTypeId]: typeof ChildAttributeTypeId
}

/** The representation behind {@link ChildAttribute}.
 *
 *  `resolveUnmount` snapshots the boundary's wrapping chain at the time the
 *  group was published (child boundary alive) so `OnUnmount` can dispatch a
 *  root message from a destroy hook that fires after the boundary has been
 *  torn down. `boundaryMappers` snapshots the `toParentMessage` lifts
 *  (innermost first) for the Scene test harness. Groups containing `OnMount`
 *  also carry `resolveMountDispatch`, which binds the Mount to the acquiring
 *  render's dispatch owner while following that owner's current live wrappers.
 *
 * @internal */
export type InternalChildAttribute = Readonly<{
  readonly [BRAND]: true
  readonly attribute: unknown
  readonly dispatch: DispatchSync
  readonly resolveUnmount: (message: unknown) => () => void
  readonly boundaryMappers: ReadonlyArray<(message: unknown) => unknown>
  readonly resolveMountDispatch?: MountDispatchResolver
}>

export const isChildAttribute = (
  value: unknown,
): value is InternalChildAttribute =>
  typeof value === 'object' && value !== null && BRAND in value

/** Captures the current boundary's dispatcher and wraps each attribute
 *  so handlers inside it route through that boundary's wrapping chain at
 *  event-fire time, even when the attribute is later spread into a
 *  parent's element in a different boundary.
 *
 *  Submodels call this when publishing attribute groups to a consumer's
 *  `toView` slot callback:
 *
 *  ```ts
 *  // Inside a SubmodelView running in the child's boundary:
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
 *  Submodel's `toParentMessage`. */
export const childAttributes = <Attribute>(
  attributes: ReadonlyArray<Attribute>,
): ReadonlyArray<ChildAttribute> => {
  const dispatch = requireDispatch()
  const resolveUnmount = requireUnmountResolver()
  const boundaryMappers = requireBoundaryMappers()
  const resolveMountDispatch = attributes.some(isOnMountAttribute)
    ? requireMountDispatchResolver()
    : undefined
  const published: ReadonlyArray<InternalChildAttribute> = attributes.map(
    attribute => ({
      [BRAND]: true,
      attribute,
      dispatch,
      resolveUnmount,
      boundaryMappers,
      ...(resolveMountDispatch !== undefined && { resolveMountDispatch }),
    }),
  )
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return published as unknown as ReadonlyArray<ChildAttribute>
}
