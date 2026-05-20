import { Predicate } from 'effect'

import type { VNode } from '../vdom.js'
import { clearRuntime, pushScope, requireScope } from './runtimeSingleton.js'
import {
  type WrapDescriptor,
  composeScope,
  registerScopeWrap,
} from './scope.js'

/** Configuration for embedding a child Submodel into a parent's view.
 *
 *  - `id`: unique identifier for this Submodel instance under the current
 *    scope. For lists, use a stable per-item id (the same one you'd give
 *    `h.list`). For singletons, any stable string works.
 *  - `view`: the child's view function. Must be referentially stable
 *    (declared at module scope) for memoization at the boundary to be
 *    effective.
 *  - `model`: the child's model. Compared by `===` for cache-hit decisions
 *    when wrapped in `h.list`.
 *  - `inputs`: optional second-argument data passed to `view`. Use for
 *    slot content (user-built VNodes that render inside the child) or
 *    other per-render configuration the child accepts.
 *  - `wrapWith`: a referentially stable Message constructor that wraps
 *    child messages into the current scope's Message type. Typically a
 *    `Got*Message` variant defined at module scope.
 *  - `wrapArgs`: a primitive record of extra args spread into `wrapWith`
 *    alongside the child message. Use for per-instance identifiers
 *    (e.g. `{ entryId: entry.id }`).
 *  - `emit`: optional per-tag handler map. When the child dispatches a
 *    message whose `_tag` matches a key in `emit`, the matching handler
 *    runs INSTEAD of `wrapWith` for that message, producing a parent-scope
 *    Message directly. Use this for high-level events the parent wants to
 *    react to declaratively (e.g. `SelectedDate`, `Cancelled`) without
 *    pattern-matching the child's full Message union inside its
 *    `GotChildMessage` handler. Unmatched tags still flow through
 *    `wrapWith`. */
export type SubmodelConfig<
  Model,
  ChildMessage,
  WrapArgs extends Readonly<Record<string, unknown>>,
  Inputs = void,
> = Readonly<{
  id: string
  view: Inputs extends void
    ? (model: Model) => VNode | null
    : (model: Model, inputs: Inputs) => VNode | null
  model: Model
  inputs?: Inputs
  wrapWith: (args: WrapArgs & { readonly message: ChildMessage }) => unknown
  wrapArgs: WrapArgs
  emit?: ChildMessage extends { readonly _tag: string }
    ? {
        readonly [K in ChildMessage['_tag']]?: (
          message: Extract<ChildMessage, { readonly _tag: K }>,
        ) => unknown
      }
    : never
}>

/** Embeds a child Submodel at this position in the parent's view tree.
 *
 *  The child's view runs in a new dispatch scope keyed by `id`. Inside
 *  the child, `h.OnClick(ChildMessage(...))` and other event attributes
 *  dispatch the raw child Message. The runtime applies `wrapWith` (with
 *  `wrapArgs` spread in) at event-fire time to translate the child
 *  message into the current scope's Message type, walking up the Submodel
 *  chain to reach the root.
 *
 *  Because the wrapping is data (`wrapWith` is a referentially stable
 *  constructor, `wrapArgs` is a primitive record), the child view itself
 *  has no per-render-fresh closures threaded through it and memoizes
 *  cleanly. The runtime stores `{ wrapWith, wrapArgs }` in a side-table
 *  keyed by the scope id; cached child VNodes carry only the scope id
 *  and the raw child Message.
 *
 *  Slot content (user-built VNodes passed via `inputs`) keeps the scope
 *  it was constructed in, so user-provided handlers inside slots dispatch
 *  through the user's wrapping chain, not the embedded Submodel's. */
export const submodel = <
  Model,
  ChildMessage,
  WrapArgs extends Readonly<Record<string, unknown>>,
  Inputs = void,
>(
  config: SubmodelConfig<Model, ChildMessage, WrapArgs, Inputs>,
): VNode | null => {
  const { registry, scopeId: parentScopeId } = requireScope()
  const childScopeId = composeScope(parentScopeId, config.id)

  registerScopeWrap(registry, childScopeId, {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    wrapWith: config.wrapWith as WrapDescriptor['wrapWith'],
    wrapArgs: config.wrapArgs,
    ...(config.emit !== undefined && {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      emit: config.emit as NonNullable<WrapDescriptor['emit']>,
    }),
  })

  pushScope(childScopeId)
  try {
    if (Predicate.isUndefined(config.inputs)) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      return (config.view as (model: Model) => VNode | null)(config.model)
    }
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    return (config.view as (model: Model, inputs: Inputs) => VNode | null)(
      config.model,
      config.inputs,
    )
  } finally {
    clearRuntime()
  }
}
