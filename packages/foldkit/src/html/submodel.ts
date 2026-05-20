import { Predicate } from 'effect'

import type { VNode } from '../vdom.js'
import { clearRuntime, pushScope, requireScope } from './runtimeSingleton.js'
import {
  type ScopeRegistry,
  type WrapDescriptor,
  composeScope,
  deregisterScopeWrap,
  registerScopeWrap,
} from './scope.js'

const SUBMODEL_MESSAGE_BRAND = '__submodelMessage'

/** A view function branded with the Message type it dispatches. The brand
 *  is a phantom (optional) field, carrying no runtime value; it exists
 *  purely so `h.submodel` can infer the child's Message type from the view
 *  and propagate it into `wrapWith`, `emit`, and the slot attribute types
 *  the consumer sees inside `inputs`.
 *
 *  Submodel authors declare their view with this type:
 *
 *  ```ts
 *  export const view: SubmodelView<Counter.Model, Counter.Message> =
 *    (model) => h.button([h.OnClick(Increment())], ['+'])
 *  ```
 *
 *  When `Inputs` is provided, the view takes a second `inputs` argument:
 *
 *  ```ts
 *  export const view: SubmodelView<Checkbox.Model, Checkbox.Message, ViewInputs> =
 *    (model, inputs) => inputs.toView({ checkbox: [...] })
 *  ```
 *
 *  The brand is structural and unenforced at runtime — any function with
 *  matching call signatures assigns to it. The phantom field is what lets
 *  TypeScript infer `Message` at `h.submodel` call sites without forcing
 *  consumers to annotate `wrapWith` parameters by hand. */
export type SubmodelView<Model, Message, Inputs = void> = (Inputs extends void
  ? (model: Model) => VNode | null
  : (model: Model, inputs: Inputs) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]?: Message
}

type AnySubmodelView = ((...args: ReadonlyArray<any>) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]?: unknown
}

type ViewModelOf<View extends AnySubmodelView> = Parameters<View>[0]

type ViewInputsOf<View extends AnySubmodelView> =
  Parameters<View> extends [unknown, infer Inputs] ? Inputs : void

type ViewMessageOf<View extends AnySubmodelView> = View extends {
  readonly [SUBMODEL_MESSAGE_BRAND]?: infer Message
}
  ? Message
  : never

type EmitMap<Message> = Message extends { readonly _tag: string }
  ? {
      readonly [K in Message['_tag']]?: (
        message: Extract<Message, { readonly _tag: K }>,
      ) => unknown
    }
  : never

/** Configuration for embedding a child Submodel into a parent's view.
 *
 *  - `id`: unique identifier for this Submodel instance under the current
 *    scope. For lists, use a stable per-item id (the same one you'd give
 *    `h.list`). For singletons, any stable string works. Duplicate ids at
 *    the same parent scope throw at view-build time.
 *  - `view`: the child's `SubmodelView`. The view's brand carries the
 *    child's Message type so `wrapWith` and `emit` get correct inference
 *    without manual annotation.
 *  - `model`: the child's model, inferred from `view`'s first parameter.
 *    Compared by `===` when the boundary is wrapped in `h.list`.
 *  - `inputs`: optional second-argument data passed to `view`, inferred
 *    from `view`'s second parameter. Function values inside `inputs`
 *    (slot callbacks like `toView`) are auto-wrapped to execute in the
 *    parent's scope, so handlers the consumer builds inside them
 *    dispatch through the parent's wrapping chain rather than the
 *    embedded Submodel's.
 *  - `wrapWith`: a referentially stable Message constructor that wraps
 *    child messages into the current scope's Message type. The `message`
 *    field of its argument is typed as the child's Message via the
 *    view's brand, so destructuring (`{ message }`) is correctly typed
 *    without annotation.
 *  - `wrapArgs`: a primitive record of extra args spread into `wrapWith`
 *    alongside the child message. Use for per-instance identifiers
 *    (e.g. `{ entryId: entry.id }`).
 *  - `emit`: optional per-tag handler map keyed by the child's Message
 *    `_tag`. When the child dispatches a message whose `_tag` matches a
 *    key in `emit`, the matching handler runs INSTEAD of `wrapWith` for
 *    that message. Each handler's argument is narrowed to the specific
 *    variant via `Extract`. Use this for high-level events the parent
 *    wants to react to declaratively (analogous to the old `onSelected*`
 *    callback prop) without pattern-matching the child's full Message
 *    union inside its `GotChildMessage` handler. Unmatched tags fall
 *    through to `wrapWith`. */
export type SubmodelConfig<
  View extends AnySubmodelView,
  WrapArgs extends Readonly<Record<string, unknown>>,
> = Readonly<{
  id: string
  view: View
  model: ViewModelOf<View>
  inputs?: ViewInputsOf<View>
  wrapWith: (
    args: WrapArgs & { readonly message: ViewMessageOf<View> },
  ) => unknown
  wrapArgs: WrapArgs
  emit?: EmitMap<ViewMessageOf<View>>
}>

const wrapInputsForOuterScope = <Inputs>(
  inputs: Inputs,
  outerScopeId: string,
): Inputs => {
  if (inputs === undefined || inputs === null || typeof inputs !== 'object') {
    return inputs
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const source = inputs as Readonly<Record<string, unknown>>
  const wrapped: Record<string, unknown> = {}
  for (const key of Object.keys(source)) {
    const value = source[key]
    if (typeof value === 'function') {
      wrapped[key] = (...args: ReadonlyArray<unknown>) => {
        pushScope(outerScopeId)
        try {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          return (value as (...args: ReadonlyArray<unknown>) => unknown)(
            ...args,
          )
        } finally {
          clearRuntime()
        }
      }
    } else {
      wrapped[key] = value
    }
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return wrapped as Inputs
}

/** Attaches a snabbdom `destroy` hook to the VNode that deregisters this
 *  Submodel's scope when its DOM node is removed from the tree. Composes
 *  with any existing destroy hook the user's view may have set.
 *
 *  This is what lets `h.submodel` survive `h.list` cache hits. When a
 *  cached vnode is reused across renders, snabbdom doesn't fire destroy,
 *  so the wrap stays registered and dispatches continue to route
 *  correctly. When the vnode is actually removed (entry deleted from a
 *  list, conditional render flips), destroy fires and the wrap is
 *  evicted — bounded memory, no leaks. */
const attachScopeCleanup = (
  vnode: VNode,
  registry: ScopeRegistry,
  scopeId: string,
): void => {
  const data = vnode.data ?? {}
  const hook = data.hook ?? {}
  const previousDestroy = hook.destroy
  const compositeDestroy = (removed: VNode): void => {
    deregisterScopeWrap(registry, scopeId)
    if (previousDestroy !== undefined) {
      previousDestroy(removed)
    }
  }
  vnode.data = { ...data, hook: { ...hook, destroy: compositeDestroy } }
}

export const submodel = <
  View extends AnySubmodelView,
  WrapArgs extends Readonly<Record<string, unknown>>,
>(
  config: SubmodelConfig<View, WrapArgs>,
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
  let vnode: VNode | null
  try {
    if (Predicate.isUndefined(config.inputs)) {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const view = config.view as (model: ViewModelOf<View>) => VNode | null
      vnode = view(config.model)
    } else {
      const wrappedInputs = wrapInputsForOuterScope(
        config.inputs,
        parentScopeId,
      )
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      const view = config.view as (
        model: ViewModelOf<View>,
        inputs: ViewInputsOf<View>,
      ) => VNode | null
      vnode = view(config.model, wrappedInputs)
    }
  } finally {
    clearRuntime()
  }

  if (vnode !== null) {
    attachScopeCleanup(vnode, registry, childScopeId)
  }

  return vnode
}
