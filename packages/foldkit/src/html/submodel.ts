import { type VNode, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryRegistry,
  type WrapDescriptor,
  composeBoundary,
  deregisterBoundaryWrap,
  hasNestedOutlineForSubtree,
  registerBoundaryWrap,
  shouldRecordOutline,
  submodelModelChanged,
  trackOutline,
} from './boundary.js'
import { isChildAttribute } from './childAttribute.js'
import type { HtmlBuilder } from './index.js'
import {
  type Frame,
  clearRuntime,
  getCurrentFrame,
  pushBoundary,
  pushFrame,
} from './runtimeSingleton.js'

// NOTE: string key (not Symbol) so SubmodelView types from different
// module instances (e.g. pnpm hoisting variations) stay structurally
// compatible.
const SUBMODEL_MESSAGE_BRAND = '__submodelMessage'

/** A view function branded with the Message type it dispatches. Build
 *  one with {@link defineView}:
 *
 *  ```ts
 *  export const view = defineView<Counter.Model, Counter.Message>(
 *    (model, h) => h.button([h.OnClick(Increment())], ['+']),
 *  )
 *  ```
 *
 *  When `ViewInputs` is provided, the view takes `viewInputs` as its
 *  second argument and the builder moves to third position:
 *
 *  ```ts
 *  export const view = defineView<
 *    CommandMenu.Model,
 *    CommandMenu.Message,
 *    ViewInputs
 *  >((model, viewInputs, h) =>
 *    viewInputs.toView({
 *      isOpen: model.isOpen,
 *      buttonAttributes: [...],
 *      menuAttributes: [...],
 *      items: menuItemSlots(model, viewInputs.items),
 *    }),
 *  )
 *  ```
 *
 *  Required at the `h.submodel` call site so unbranded plain functions
 *  fail to type-check there. */
export type SubmodelView<Model, Message, ViewInputs = void> = ([
  ViewInputs,
] extends [void]
  ? (model: Model, h: HtmlBuilder<Message>) => VNode | null
  : (
      model: Model,
      viewInputs: ViewInputs,
      h: HtmlBuilder<Message>,
    ) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]: Message
}

/** Defines the view function of a Submodel, a child component embedded
 *  via `h.submodel`.
 *
 *  The runtime supplies the view's `h` builder, typed by the Submodel's
 *  own Message. It is the only builder whose handlers route through this
 *  Submodel's boundary, so a Message from another Message universe is a
 *  type error at the handler call site. A helper this view delegates to
 *  takes `h` as an ordinary parameter; markup owned by an ancestor arrives
 *  pre-built through a `viewInputs` slot callback, which the runtime
 *  executes in the ancestor's boundary.
 *
 *  Use this ONLY for views that will be embedded via `h.submodel`. Plain
 *  view functions (page-level render functions, helper render functions
 *  that compose Html, etc.) don't need to be defined this way. Write
 *  them as ordinary `(model, h) => Html` functions.
 *
 *  Explicit type arguments are required because the Model and ViewInputs
 *  parameters cannot drive inference on their own.
 *
 *  `Message` defaults to `never` so that omitting them fails loudly. Nothing in
 *  the parameter list can infer it, so without the default it would widen to
 *  `unknown` and the builder would accept any Message at all, which is exactly
 *  the confusion this type is meant to prevent. */
export const defineView = <Model, Message = never, ViewInputs = void>(
  fn: [ViewInputs] extends [void]
    ? (model: Model, h: HtmlBuilder<Message>) => VNode | null
    : (
        model: Model,
        viewInputs: ViewInputs,
        h: HtmlBuilder<Message>,
      ) => VNode | null,
): SubmodelView<Model, Message, ViewInputs> =>
  // NOTE: The cast attaches the SUBMODEL_MESSAGE_BRAND to the runtime
  // function value at the type level only. `h.submodel` reads the brand
  // at the embed site to type-check `toParentMessage` and to type the
  // builder it hands this view. There is no runtime brand to add; the
  // cast is the entire mechanism.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  fn as SubmodelView<Model, Message, ViewInputs>

/** Structural bound for any branded {@link SubmodelView}, independent of
 *  its Model, Message, and ViewInputs. `h.submodel` and
 *  {@link SubmodelConfig} constrain their `View` parameter with it so the
 *  concrete types are recovered per call site via the `View*Of`
 *  extractors. */
export type AnySubmodelView = ((
  ...args: ReadonlyArray<any>
) => VNode | null) & {
  readonly [SUBMODEL_MESSAGE_BRAND]: unknown
}

type ViewModelOf<View extends AnySubmodelView> = Parameters<View>[0]

type ViewInputsOf<View extends AnySubmodelView> =
  Parameters<View> extends [unknown, infer ViewInputs, unknown]
    ? ViewInputs
    : void

type ViewMessageOf<View extends AnySubmodelView> = View extends {
  readonly [SUBMODEL_MESSAGE_BRAND]: infer Message
}
  ? Message
  : never

/** Configuration for embedding a child Submodel into a parent's view.
 *
 *  - `slotId`: unique identifier for this Submodel instance under the
 *    current boundary. Name the slot semantically (e.g.
 *    `'sidebar-group'`). For lists, use a stable per-item id (typically
 *    `entry.id`), not the array index. If the same model is rendered in
 *    two DOM positions (desktop + mobile, master + detail), each slot
 *    needs its own id (e.g. `'desktop-sidebar-group'`,
 *    `'mobile-sidebar-group'`). Two `h.submodel` calls inside the same
 *    parent boundary with the same `slotId` throw at view-build time,
 *    including across `createLazy`/`createKeyedLazy` cache hits.
 *  - `view`: the child's `SubmodelView`. Must be branded via
 *    {@link defineView} so `h.submodel` can infer the child's Message
 *    type. Unbranded plain functions fail to type-check here.
 *  - `model`: the child's model, inferred from `view`'s first parameter.
 *    Compared by `===` when the boundary is wrapped in a memoizing
 *    helper such as `createKeyedLazy`.
 *  - `viewInputs`: optional second-argument data passed to `view`,
 *    inferred from `view`'s second parameter. Function values AT THE TOP
 *    LEVEL of `viewInputs` (slot callbacks like `toView`) are
 *    auto-wrapped to execute in the parent's boundary so handlers the
 *    consumer builds inside them dispatch through the parent's wrapping
 *    chain. Function values nested below the top level (e.g.
 *    `viewInputs: { config: { onSubmit } }`) throw at view-build time
 *    with a path-based error like `viewInputs.config.onSubmit`. The
 *    check is runtime-only (TypeScript cannot distinguish a
 *    user-declared nested callback from a data value whose prototype
 *    carries methods), so a misuse compiles cleanly and surfaces the
 *    first time the boundary renders. Keep slot callbacks at the top
 *    level of `viewInputs`.
 *  - `toParentMessage`: function that lifts a child message into the
 *    current boundary's Message type. The argument is typed as the
 *    child's Message via the view's brand, and the return is typed as
 *    the embedding builder's Message, so destructuring is correctly
 *    typed without annotation and a lift into the wrong Message union
 *    fails to compile. For per-instance identifiers, capture them in a
 *    closure
 *    (`(message) => GotEntryMessage({ entryId: entry.id, message })`).
 *
 *  High-level events the parent handles declaratively flow through
 *  each Submodel's `OutMessage`. Use `Update.foldChild` to run the child
 *  update, lift its Commands, and match the optional OutMessage without
 *  unpacking the child result by hand. See `Menu`, `Listbox`, etc., for
 *  examples. */
export type SubmodelConfig<
  View extends AnySubmodelView,
  ParentMessage,
> = Readonly<{
  slotId: string
  model: ViewModelOf<View>
  view: View
  toParentMessage: (message: ViewMessageOf<View>) => ParentMessage
}> &
  // NOTE: required exactly when the view declares them. Left optional, omitting
  // them still compiles and the runtime calls a three-parameter view with two
  // arguments, so the builder lands in the `viewInputs` slot and shadows every
  // field whose name collides with an element constructor.
  ([ViewInputsOf<View>] extends [void]
    ? Readonly<{ viewInputs?: never }>
    : Readonly<{ viewInputs: ViewInputsOf<View> }>)

const isPlainObject = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Walks below the top level of `viewInputs` and throws if it finds a
 *  function. Top-level functions are auto-scoped to the parent
 *  boundary; functions nested inside an object value or array element
 *  would silently capture the child's boundary and dispatch through
 *  the child's wrapping chain, which is almost certainly not what the
 *  consumer meant. Failing loud at view-build time is cheaper than a
 *  confused bug report from a misrouted Message. */
const assertNoNestedFunctions = (
  viewInputs: Readonly<Record<string, unknown>>,
): void => {
  for (const key of Object.keys(viewInputs)) {
    const value = viewInputs[key]
    if (isFrameworkBranded(value)) {
      continue
    }
    if (isPlainObject(value) || Array.isArray(value)) {
      walkForFunctions(value, [key])
    }
  }
}

// Framework-branded values that legitimately carry function members
// internally (e.g. `ChildAttribute.dispatch`). The walker treats these
// as opaque leaves, the same way it treats primitives.
const isFrameworkBranded = (value: unknown): boolean => isChildAttribute(value)

const walkForFunctions = (
  source: Readonly<Record<string, unknown>> | ReadonlyArray<unknown>,
  path: ReadonlyArray<string>,
): void => {
  const visit = (value: unknown, segment: string): void => {
    const nextPath = [...path, segment]
    if (typeof value === 'function') {
      throw new Error(
        `Foldkit: h.submodel \`viewInputs\` may only contain functions at the top level. Found a function at \`viewInputs.${nextPath.join('.')}\`. Lift it to the top level of \`viewInputs\` so it can be auto-scoped to the parent boundary, or pass the value as primitive data.`,
      )
    }
    if (isFrameworkBranded(value)) {
      return
    }
    if (isPlainObject(value) || Array.isArray(value)) {
      walkForFunctions(value, nextPath)
    }
  }

  if (Array.isArray(source)) {
    source.forEach((element, index) => visit(element, `[${index}]`))
  } else if (isPlainObject(source)) {
    for (const key of Object.keys(source)) {
      visit(source[key], key)
    }
  }
}

const wrapViewInputsForOuterBoundary = <ViewInputs>(
  viewInputs: ViewInputs,
  outerFrame: Frame,
): ViewInputs => {
  if (!isPlainObject(viewInputs)) {
    return viewInputs
  }
  assertNoNestedFunctions(viewInputs)
  const wrapped: Record<string, unknown> = {}
  for (const key of Object.keys(viewInputs)) {
    const value = viewInputs[key]
    if (typeof value === 'function') {
      // Capture the parent's full frame (dispatch, context, registry,
      // boundaryId) at wrap time. The slot callback uses `pushFrame` to
      // replay that exact frame on every invocation, regardless of what
      // happens to be on the stack at call time. Without this, a
      // callback invoked from a deferred context (setTimeout, stored
      // callback) would inherit from whatever render's frame was active,
      // silently mis-binding dispatch and registry.
      wrapped[key] = (...args: ReadonlyArray<unknown>) => {
        pushFrame(outerFrame)
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
  return wrapped as ViewInputs
}

/** Returns a copy of the vnode with a snabbdom `destroy` hook that
 *  deregisters this Submodel's boundary when the DOM node is removed.
 *  Composes with any existing destroy hook the user's view may have set.
 *
 *  Copies the vnode (rather than mutating in place) so module-level
 *  cached vnodes a user might return from view are not contaminated with
 *  a destroy hook bound to this boundary id.
 *
 *  This is what lets `h.submodel` survive cache hits from
 *  `createKeyedLazy`. When a cached vnode is reused across renders,
 *  snabbdom doesn't fire destroy, so the wrap stays registered and
 *  dispatches continue to route correctly. When the vnode is actually
 *  removed (entry deleted from a list, conditional render flips),
 *  destroy fires and the wrap is evicted: bounded memory, no leaks.
 *
 *  See `submodel.test.ts` for the cache-hit-survival and
 *  destroy-deregisters-wrap assertions. */
const withBoundaryCleanup = (
  vnode: VNode,
  registry: BoundaryRegistry,
  boundaryId: string,
): VNode => {
  const data = vnode.data ?? {}
  const hook = data.hook ?? {}
  const previousDestroy = hook.destroy
  const compositeDestroy = (removed: VNode): void => {
    // NOTE: a Submodel whose root vnode changes snabbdom identity across
    // renders (e.g. a keyed root whose key changed) re-registers its
    // boundary in the new view phase, then snabbdom destroys the OLD root
    // vnode in the following patch phase. That destroy must not evict the
    // freshly re-registered wrap. `seenThisRender` is cleared in
    // `beginRender`, so during patch it still reflects the just-completed
    // view phase: the boundary's presence there means it is live this cycle
    // (a remount), not a true unmount. Deleting it here would surface later
    // as `dispatchAcrossBoundary missing wrap`.
    if (!registry.seenThisRender.has(boundaryId)) {
      deregisterBoundaryWrap(registry, boundaryId)
    }
    if (previousDestroy !== undefined) {
      previousDestroy(removed)
    }
  }
  const wrapped: VNode = {
    ...vnode,
    data: { ...data, hook: { ...hook, destroy: compositeDestroy } },
  }
  // NOTE: a memoized child view returns the same vnode by reference each render;
  // this wrapper is fresh but shares its cached children. Propagate membership
  // so dedupeSharedVNodes keeps the wrapper opaque instead of cloning that
  // cached subtree every render.
  if (memoizedVNodes.has(vnode)) {
    memoizedVNodes.add(wrapped)
  }
  for (let index = 0; index < registry.outlineBuffer.length; index++) {
    const entry = registry.outlineBuffer[index]
    if (entry !== undefined && entry.vnode === vnode) {
      registry.outlineBuffer[index] = { ...entry, vnode: wrapped }
    }
  }
  return wrapped
}

/** Implementation behind `h.submodel`. Registers the child's boundary
 *  wrap, pushes the child boundary, and invokes the child's
 *  {@link SubmodelView} with the child-typed builder. Reached only
 *  through a builder's `submodel` method, which fixes `toParentMessage`'s
 *  return to the embedding frame's Message; the html factory passes the
 *  process-wide builder singleton as `htmlBuilderSingleton`. */
export const submodel = <View extends AnySubmodelView>(
  config: SubmodelConfig<View, unknown>,
  htmlBuilderSingleton: HtmlBuilder<unknown>,
): VNode | null => {
  // Snapshot the parent frame BEFORE pushing the child boundary. The
  // snapshot is captured into slot-callback closures by
  // `wrapViewInputsForOuterBoundary` so they can replay the parent's
  // full frame when invoked.
  const parentFrame = getCurrentFrame()
  const registry = parentFrame.boundaryRegistry
  const childBoundaryId = composeBoundary(parentFrame.boundaryId, config.slotId)

  registerBoundaryWrap(registry, childBoundaryId, {
    toParentMessage:
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config.toParentMessage as WrapDescriptor['toParentMessage'],
  })

  // NOTE: the builder handed to the child view is the process-wide
  // singleton retyped to the child's Message. The value carries no
  // Message state (dispatch resolves from the frame pushed below), so
  // the cast is the entire mechanism, exactly like the brand cast in
  // `defineView`.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const childBuilder = htmlBuilderSingleton as HtmlBuilder<ViewMessageOf<View>>

  let vnode: VNode | null
  pushBoundary(childBoundaryId)
  try {
    try {
      if (!Object.hasOwn(config, 'viewInputs')) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const view = config.view as (
          model: ViewModelOf<View>,
          h: HtmlBuilder<ViewMessageOf<View>>,
        ) => VNode | null
        vnode = view(config.model, childBuilder)
      } else {
        const wrappedViewInputs = wrapViewInputsForOuterBoundary(
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          config.viewInputs as ViewInputsOf<View>,
          parentFrame,
        )
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const view = config.view as (
          model: ViewModelOf<View>,
          viewInputs: ViewInputsOf<View>,
          h: HtmlBuilder<ViewMessageOf<View>>,
        ) => VNode | null
        vnode = view(config.model, wrappedViewInputs, childBuilder)
      }
    } catch (error) {
      // The view threw; the registered wrap would otherwise leak with
      // no destroy hook ever firing. Drop it before propagating.
      deregisterBoundaryWrap(registry, childBoundaryId)
      throw error
    }
  } finally {
    clearRuntime()
  }

  if (vnode === null) {
    // No vnode means no destroy hook will ever fire; deregister now so
    // the wrap doesn't leak.
    deregisterBoundaryWrap(registry, childBoundaryId)
    return null
  }

  const wrapped = withBoundaryCleanup(vnode, registry, childBoundaryId)
  if (shouldRecordOutline()) {
    if (
      submodelModelChanged(registry, childBoundaryId, config.model) &&
      !hasNestedOutlineForSubtree(registry, wrapped)
    ) {
      trackOutline(registry, childBoundaryId, childBoundaryId, wrapped)
    }
  }
  return wrapped
}
