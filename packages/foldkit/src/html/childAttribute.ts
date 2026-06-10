import { type DispatchSync, requireDispatch } from './runtimeSingleton.js'

const BRAND = '__childAttribute'

/** An attribute carrying a handler that dispatches through a Submodel
 *  boundary's wrapping chain. Published by Submodels (typically Foldkit's
 *  `Ui.*` components) for a parent to spread into its own element
 *  attribute arrays. The parent does not know or care which child
 *  produced these; the runtime routes each handler through the
 *  originating Submodel's wrap chain at event-fire time.
 *
 *  Created via {@link childAttributes}. Element constructors accept
 *  `ChildAttribute` alongside `Attribute<Message>` in their attribute
 *  arrays. */
export type ChildAttribute = Readonly<{
  readonly [BRAND]: true
  readonly attribute: unknown
  readonly dispatch: DispatchSync
}>

export const isChildAttribute = (value: unknown): value is ChildAttribute =>
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
  return attributes.map(attribute => ({
    [BRAND]: true,
    attribute,
    dispatch,
  }))
}
