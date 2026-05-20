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

// NOTE: string key (not Symbol) so SubmodelView types from different
// module instances (e.g. pnpm hoisting variations) stay structurally
// compatible. Reviewed; intentional.
const SUBMODEL_MESSAGE_BRAND = '__submodelMessage'

/** A view function branded with the Message type it dispatches. The brand
 *  (`__submodelMessage`) is a phantom field with no runtime value; it
 *  exists purely so `h.submodel` can infer the child's Message type from
 *  the view and propagate it into `wrapWith` and `emit`.
 *
 *  Submodel authors brand their view with the {@link defineSubmodelView}
 *  helper:
 *
 *  ```ts
 *  export const view = defineSubmodelView<Counter.Model, Counter.Message>(
 *    (model) => h.button([h.OnClick(Increment())], ['+']),
 *  )
 *  ```
 *
 *  When `Inputs` is provided, the view takes a second `inputs` argument:
 *
 *  ```ts
 *  export const view = defineSubmodelView<
 *    Checkbox.Model,
 *    Checkbox.Message,
 *    ViewInputs
 *  >((model, inputs) => inputs.toView({ checkbox: [...] }))
 *  ```
 *
 *  The brand is required at the `h.submodel` call site (not optional) so
 *  unbranded plain functions fail to type-check there with an explicit
 *  error rather than silently inferring `Message = never`. */
export type SubmodelView<Model, Message, Inputs = void> = (Inputs extends void
  ? (model: Model) => VNode | null
  : (model: Model, inputs: Inputs) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]: Message
}

/** Builds a {@link SubmodelView}. The runtime value is just the function
 *  you pass in; the helper only exists to attach the phantom Message
 *  brand at the type level so `h.submodel` can infer it.
 *
 *  Explicit type arguments are required because Message has no
 *  inferable source on the function signature itself. That's the whole
 *  point of branding. */
export const defineSubmodelView = <Model, Message, Inputs = void>(
  fn: Inputs extends void
    ? (model: Model) => VNode | null
    : (model: Model, inputs: Inputs) => VNode | null,
): SubmodelView<Model, Message, Inputs> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  fn as SubmodelView<Model, Message, Inputs>

type AnySubmodelView = ((...args: ReadonlyArray<any>) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]: unknown
}

type ViewModelOf<View extends AnySubmodelView> = Parameters<View>[0]

type ViewInputsOf<View extends AnySubmodelView> =
  Parameters<View> extends [unknown, infer Inputs] ? Inputs : void

type ViewMessageOf<View extends AnySubmodelView> = View extends {
  readonly [SUBMODEL_MESSAGE_BRAND]: infer Message
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
 *    `h.list`). Duplicate ids at the same parent scope throw at
 *    view-build time.
 *  - `view`: the child's `SubmodelView`. Must be branded via
 *    {@link defineSubmodelView} so `h.submodel` can infer the child's
 *    Message type. Unbranded plain functions fail to type-check here.
 *  - `model`: the child's model, inferred from `view`'s first parameter.
 *    Compared by `===` when the boundary is wrapped in `h.list`.
 *  - `inputs`: optional second-argument data passed to `view`, inferred
 *    from `view`'s second parameter. Function values AT THE TOP LEVEL of
 *    `inputs` (slot callbacks like `toView`) are auto-wrapped to execute
 *    in the parent's scope so handlers the consumer builds inside them
 *    dispatch through the parent's wrapping chain. The wrapping only
 *    recurses one level deep. Function values inside nested objects
 *    (e.g. `inputs: { config: { onSubmit } }`) are NOT auto-wrapped, and
 *    will capture the child's scope at call time. Keep slot callbacks at
 *    the top level of `inputs`.
 *  - `wrapWith`: a referentially stable Message constructor that wraps
 *    child messages into the current scope's Message type. The `message`
 *    field of its argument is typed as the child's Message via the
 *    view's brand, so destructuring (`{ message }`) is correctly typed
 *    without annotation. The wrap is registered as data
 *    (`{ wrapWith, wrapArgs }`) rather than as a closure: it's the split
 *    of "stable constructor" + "primitive args record" that lets the
 *    descriptor compare by reference across renders, so `h.list`'s
 *    boundary memoization survives. A single closure `(msg) =>
 *    GotEntryMessage({ entryId, message: msg })` would be fresh per
 *    render and defeat the cache.
 *  - `wrapArgs`: a primitive record of extra args spread into `wrapWith`
 *    alongside the child message. Use for per-instance identifiers
 *    (e.g. `{ entryId: entry.id }`). Optional. Defaults to `{}` when
 *    `wrapWith` takes no extra args besides `message`.
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
  wrapArgs?: WrapArgs
  emit?: EmitMap<ViewMessageOf<View>>
}>

const EMPTY_WRAP_ARGS: Readonly<Record<string, unknown>> = Object.freeze({})

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

/** Returns a copy of the vnode with a snabbdom `destroy` hook that
 *  deregisters this Submodel's scope when the DOM node is removed.
 *  Composes with any existing destroy hook the user's view may have set.
 *
 *  Copies the vnode (rather than mutating in place) so module-level
 *  cached vnodes a user might return from view are not contaminated with
 *  a destroy hook bound to this scope id.
 *
 *  This is what lets `h.submodel` survive `h.list` cache hits. When a
 *  cached vnode is reused across renders, snabbdom doesn't fire destroy,
 *  so the wrap stays registered and dispatches continue to route
 *  correctly. When the vnode is actually removed (entry deleted from a
 *  list, conditional render flips), destroy fires and the wrap is
 *  evicted: bounded memory, no leaks.
 *
 *  See `submodel.test.ts` for the cache-hit-survival and
 *  destroy-deregisters-wrap assertions. */
const withScopeCleanup = (
  vnode: VNode,
  registry: ScopeRegistry,
  scopeId: string,
): VNode => {
  const data = vnode.data ?? {}
  const hook = data.hook ?? {}
  const previousDestroy = hook.destroy
  const compositeDestroy = (removed: VNode): void => {
    deregisterScopeWrap(registry, scopeId)
    if (previousDestroy !== undefined) {
      previousDestroy(removed)
    }
  }
  return {
    ...vnode,
    data: { ...data, hook: { ...hook, destroy: compositeDestroy } },
  }
}

export const submodel = <
  View extends AnySubmodelView,
  WrapArgs extends Readonly<Record<string, unknown>> = Readonly<
    Record<string, never>
  >,
>(
  config: SubmodelConfig<View, WrapArgs>,
): VNode | null => {
  const { registry, scopeId: parentScopeId } = requireScope()
  const childScopeId = composeScope(parentScopeId, config.id)
  const wrapArgs = config.wrapArgs ?? EMPTY_WRAP_ARGS

  registerScopeWrap(registry, childScopeId, {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    wrapWith: config.wrapWith as WrapDescriptor['wrapWith'],
    wrapArgs,
    ...(config.emit !== undefined && {
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      emit: config.emit as NonNullable<WrapDescriptor['emit']>,
    }),
  })

  let vnode: VNode | null
  pushScope(childScopeId)
  try {
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
    } catch (error) {
      // The view threw; the registered wrap would otherwise leak with
      // no destroy hook ever firing. Drop it before propagating.
      deregisterScopeWrap(registry, childScopeId)
      throw error
    }
  } finally {
    clearRuntime()
  }

  if (vnode === null) {
    // No vnode means no destroy hook will ever fire; deregister now so
    // the wrap doesn't leak.
    deregisterScopeWrap(registry, childScopeId)
    return null
  }

  return withScopeCleanup(vnode, registry, childScopeId)
}
