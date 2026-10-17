import { Context } from 'effect'

import { type ViewScope, ViewScopeTypeId } from '../block/identity.js'
import {
  type ActiveInstance,
  CurrentInstance,
} from '../block/instanceContext.js'
import type { AnyMountHandler } from '../mount/index.js'
import { type VNode, memoizedVNodes } from '../vdom.js'
import {
  type BoundaryRegistry,
  type WrapBlock,
  beginBoundaryWrapTransaction,
  commitBoundaryWrapTransaction,
  composeBoundary,
  deregisterBoundaryWrap,
  registerBoundaryWrap,
  rollbackBoundaryWrapTransaction,
} from './boundary.js'
import { isChildAttribute } from './childAttribute.js'
import type { Document, HtmlBuilder, NativeHtmlBuilder } from './index.js'
import {
  type DispatchSync,
  type Frame,
  clearRuntime,
  getCurrentFrame,
  pushBoundary,
  pushFrame,
} from './runtimeSingleton.js'

// NOTE: string key (not Symbol) so BlockView types from different
// module instances (e.g. pnpm hoisting variations) stay structurally
// compatible.
const SUBMODEL_MESSAGE_BRAND = '__blockMessage'
const SUBMODEL_MODEL_BRAND = '__blockModel'
const SUBMODEL_MOUNT_REQUIREMENTS_BRAND = '__blockMountRequirements'

/**
 * A child view branded with its Model, Message, and registered capabilities.
 * Author the primary view through a named Composition, including an empty graph:
 *
 * ```ts
 * export const CounterComposition = Counter.makeComposition()
 *
 * export const view = CounterComposition.makeView((model, h) =>
 *   h.button([h.OnClick(Message.ClickedIncrement())], [globalThis.String(model.count)]),
 * )
 * ```
 *
 * Use `makeView.withInputs` for data supplied at the embedding site:
 *
 * ```ts
 * export const view = CounterComposition.makeView.withInputs<ViewInputs>(
 *   (model, viewInputs, h) =>
 *     h.button([h.OnClick(Message.ClickedIncrement())], [viewInputs.label, globalThis.String(model.count)]),
 * )
 * ```
 *
 * Complete that Composition with the view, then embed the Block through a
 * registered Binding. Plain functions cannot enter `h.block` directly.
 */
export type BlockView<
  Model,
  Message,
  ViewInputs = void,
  RequiredMountRequirements = never,
> = ([ViewInputs] extends [void]
  ? (
      model: Model,
      h: HtmlBuilder<Message, RequiredMountRequirements>,
    ) => VNode | null
  : (
      model: Model,
      viewInputs: ViewInputs,
      h: HtmlBuilder<Message, RequiredMountRequirements>,
    ) => VNode | null) & {
  readonly [SUBMODEL_MODEL_BRAND]: Model
  readonly [SUBMODEL_MESSAGE_BRAND]: Message
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: RequiredMountRequirements
}

/** A page-owning view branded with the Model, Message, and Mount requirements
 * of its root Block. Document views cannot be embedded through `h.block`. */
export type DocumentView<Model, Message, RequiredMountRequirements = never> = ((
  model: Model,
  h: HtmlBuilder<Message, RequiredMountRequirements>,
) => Document) & {
  readonly [SUBMODEL_MODEL_BRAND]: Model
  readonly [SUBMODEL_MESSAGE_BRAND]: Message
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: RequiredMountRequirements
}

/**
 * @internal A view function whose parameter types can be recovered without
 *  contextually widening unannotated parameters to `any`.
 */
type InferableBlockView = (...args: ReadonlyArray<never>) => VNode | null

/**
 * @internal Detects explicit or inferred `any`, which would erase a
 *  Block view's Message or Mount contract.
 */
type IsAny<Value> = 0 extends 1 & Value ? true : false

/** @internal Builds a branded view from an annotated Model and builder. */
type InferredBlockViewFromBuilder<Model, ViewInputs, Builder> =
  IsAny<Model> extends true
    ? never
    : IsAny<Builder> extends true
      ? never
      : Builder extends HtmlBuilder<infer Message, infer Requirements>
        ? IsAny<Message> extends true
          ? never
          : IsAny<Requirements> extends true
            ? never
            : BlockView<Model, Message, ViewInputs, Requirements>
        : never

/**
 * @internal Builds the branded view type from an explicitly annotated
 *  two- or three-parameter view function.
 */
type InferredBlockView<View extends InferableBlockView> =
  Parameters<View> extends [infer Model, infer Builder]
    ? InferredBlockViewFromBuilder<Model, void, Builder>
    : Parameters<View> extends [infer Model, infer ViewInputs, infer Builder]
      ? IsAny<ViewInputs> extends true
        ? never
        : [ViewInputs] extends [void]
          ? never
          : InferredBlockViewFromBuilder<Model, ViewInputs, Builder>
      : never

/**
 * @internal Excludes callbacks whose annotations do not describe one of the
 *  runtime-supported Block view shapes from the inference overload.
 */
type ValidInferredBlockView<View extends InferableBlockView> =
  InferredBlockView<View> extends never ? never : unknown

/**
 * Defines the view function of a Block, a child component embedded
 *  via `h.block`.
 *
 *  The runtime supplies the view's `h` builder, typed by the Block's
 *  own Message. It is the only builder whose handlers route through this
 *  Block's boundary, so a Message from another Message universe is a
 *  type error at the handler call site. A helper this view delegates to
 *  takes `h` as an ordinary parameter; markup owned by an ancestor arrives
 *  pre-built through a `viewInputs` slot callback, which the runtime
 *  executes in the ancestor's boundary.
 *
 *  Use this ONLY for views that will be embedded via `h.block`. Plain
 *  view functions (page-level render functions, helper render functions
 *  that compose Html, etc.) don't need to be defined this way. Write
 *  them as ordinary `(model, h) => Html` functions.
 *
 *  Annotate the callback's Model and `h` parameters to infer the branded view
 *  type. A view with `ViewInputs` annotates all three parameters. Explicit
 *  type arguments remain available when preferred.
 *
 *  When using explicit type arguments, `Message` defaults to `never` so that
 *  omitting it fails loudly. An unannotated callback receives the same
 *  `HtmlBuilder<never>` default instead of widening to a builder that accepts
 *  any Message.
 */
export function defineView<View extends InferableBlockView>(
  fn: View & ValidInferredBlockView<View>,
): InferredBlockView<View>
export function defineView<
  Model,
  Message = never,
  ViewInputs = void,
  RequiredMountRequirements = never,
>(
  fn: [ViewInputs] extends [void]
    ? (
        model: Model,
        h: NativeHtmlBuilder<Message, RequiredMountRequirements>,
      ) => VNode | null
    : (
        model: Model,
        viewInputs: ViewInputs,
        h: NativeHtmlBuilder<Message, RequiredMountRequirements>,
      ) => VNode | null,
): BlockView<Model, Message, ViewInputs, RequiredMountRequirements>
export function defineView<View extends InferableBlockView>(
  fn: View,
): InferredBlockView<View> {
  // NOTE: The cast attaches the SUBMODEL_MESSAGE_BRAND to the runtime
  // function value at the type level only. `h.block` reads the brand
  // at the embed site to type-check `toParentMessage` and to type the
  // builder it hands this view. There is no runtime brand to add; the
  // cast is the entire mechanism.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return fn as InferredBlockView<View>
}

/** Structural bound for any branded {@link BlockView}, independent of
 *  its Model, Message, and ViewInputs. `h.block` and
 *  {@link BlockConfig} constrain their `View` parameter with it so the
 *  concrete types are recovered per call site via the `View*Of`
 *  extractors. */
export type AnyBlockView = ((...args: ReadonlyArray<any>) => VNode | null) & {
  readonly [SUBMODEL_MODEL_BRAND]: unknown
  readonly [SUBMODEL_MESSAGE_BRAND]: unknown
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: unknown
}

/** Structural bound for any branded page-owning {@link DocumentView},
 * independent of its Model, Message, and Mount requirements. */
export type AnyDocumentView = ((...args: ReadonlyArray<any>) => Document) & {
  readonly [SUBMODEL_MODEL_BRAND]: unknown
  readonly [SUBMODEL_MESSAGE_BRAND]: unknown
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: unknown
}

/** Structural bound shared by branded embedded and page-owning views. */
export type AnyAuthoredView = ((
  ...args: ReadonlyArray<any>
) => VNode | null | Document) & {
  readonly [SUBMODEL_MODEL_BRAND]: unknown
  readonly [SUBMODEL_MESSAGE_BRAND]: unknown
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: unknown
}

type ViewModelOf<View extends AnyBlockView> = View extends {
  readonly [SUBMODEL_MODEL_BRAND]: infer Model
}
  ? Model
  : never

type ViewInputsOf<View extends AnyBlockView> =
  Parameters<View> extends [unknown, infer ViewInputs, unknown]
    ? ViewInputs
    : void

type ViewMessageOf<View extends AnyBlockView> = View extends {
  readonly [SUBMODEL_MESSAGE_BRAND]: infer Message
}
  ? Message
  : never

/** Extracts the Mount requirements carried by a branded Block view. */
export type ViewMountRequirementsOf<View extends AnyBlockView> = View extends {
  readonly [SUBMODEL_MOUNT_REQUIREMENTS_BRAND]: infer Requirements
}
  ? Requirements
  : never

/** Replaces a view's authored Mount requirements with the capability supplied
 * by its registered child Binding. */
export type BoundBlockView<
  View extends AnyBlockView,
  BoundRequirement,
> = BlockView<
  ViewModelOf<View>,
  ViewMessageOf<View>,
  ViewInputsOf<View>,
  BoundRequirement
>

/**
 * Base fields for a child render configuration: its view, Model, Message
 * wrapper, render position, and declared view inputs.
 *
 * `HtmlBuilder.block` accepts only {@link BoundBlockConfig}, produced by
 * a registered child Binding's `embedView` method. This base type also describes
 * the native renderer's configuration before binding scope is attached.
 */
export type BlockConfig<View extends AnyBlockView, ParentMessage> = Readonly<{
  /** @internal The child binding's capability scope. */
  [ViewScopeTypeId]?: ViewScope
  /** Stable render position within the current view boundary. */
  slotId: string
  /** Child Model rendered at this position. */
  model: ViewModelOf<View>
  /** Child-authored view to render. */
  view: View
  /** Maps Messages from the child view into the parent Message type. */
  toParentMessage: (message: ViewMessageOf<View>) => ParentMessage
}> &
  // NOTE: required exactly when the view declares them. Left optional, omitting
  // them still compiles and the runtime calls a three-parameter view with two
  // arguments, so the builder lands in the `viewInputs` slot and shadows every
  // field whose name collides with an element constructor.
  ([ViewInputsOf<View>] extends [void]
    ? Readonly<{
        /** This view declares no per-render inputs. */
        viewInputs?: never
      }>
    : Readonly<{
        /** Per-render values declared by the child-authored view. Top-level
         * callbacks execute in the parent boundary. */
        viewInputs: ViewInputsOf<View>
      }>)

/** Portable child render fields shared by Binding inputs and embedded render
 * evidence. */
export type BoundBlockFields<
  View extends AnyBlockView,
  ParentMessage,
> = Readonly<{
  /** Stable render position within the current view boundary. */
  slotId: string
  /** Child Model rendered at this position. */
  model: View['__blockModel']
  /** Child-authored view to render. */
  view: View
  /** Maps Messages from the child view into the parent Message type. */
  toParentMessage: (message: View['__blockMessage']) => ParentMessage
}> &
  (Parameters<View> extends [unknown, infer ViewInputs, unknown]
    ? Readonly<{
        /** Per-render values declared by the child-authored view. Top-level
         * callbacks execute in the parent boundary. */
        viewInputs: ViewInputs
      }>
    : Readonly<{
        /** This view declares no per-render inputs. */
        viewInputs?: never
      }>)

/** Static child render contract retained by a BoundBlockConfig's private
 * Binding scope. */
export type BoundBlockConfigEvidence<
  View extends AnyBlockView,
  ParentMessage,
> = Readonly<{
  /** Portable fields supplied to the child render. */
  config: BoundBlockFields<View, ParentMessage>
  /** Parent Message type retained for dispatch boundary validation. */
  parentMessage: ParentMessage
  /** Mount capabilities required by the child view. */
  mountRequirements: View['__blockMountRequirements']
}>

type BoundViewScope<View extends AnyBlockView, ParentMessage> = ViewScope &
  Readonly<{
    __blockConfigEvidence: BoundBlockConfigEvidence<View, ParentMessage>
  }>

/**
 * The render configuration produced by a registered child Binding's `embedView`
 * method. Its private scope evidence prevents unregistered child rendering.
 * The binding supplies the child's view, Message wrapper, and capability scope.
 * The parent supplies `slotId`, the child Model, and any declared `viewInputs`.
 *
 * A `slotId` identifies one DOM placement within the current view boundary.
 * Give separately rendered placements different IDs, and use stable entity IDs
 * for lists. Duplicate IDs in one boundary fail before the tree is patched.
 *
 * Top-level callbacks in `viewInputs`, such as `toView`, execute in the parent's
 * boundary so elements built by the parent dispatch its Messages. Nested
 * callbacks are rejected when the view builds; keep slot callbacks at the top
 * level.
 *
 * OutMessages are handled by the registered binding's `outMessage` policy.
 * Parent update code calls its `fold` method or a registered Step.
 */
export type BoundBlockConfig<
  View extends AnyBlockView,
  ParentMessage,
> = BoundBlockFields<View, ParentMessage> &
  Readonly<{
    /** @internal Retains binding scope and the complete render contract. */
    [ViewScopeTypeId]: BoundViewScope<View, ParentMessage>
  }>

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
        `Foldkit: h.block \`viewInputs\` may only contain functions at the ` +
          `top level. Found a function at \`viewInputs.${nextPath.join('.')}\`. ` +
          `Lift it to the top level of \`viewInputs\` so it can be auto-scoped to ` +
          `the parent boundary, or pass the value as primitive data.`,
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
 *  deregisters this Block's boundary when the DOM node is removed.
 *  Composes with any existing destroy hook the user's view may have set.
 *
 *  Copies the vnode (rather than mutating in place) so module-level
 *  cached vnodes a user might return from view are not contaminated with
 *  a destroy hook bound to this boundary id.
 *
 *  This is what lets `h.block` survive cache hits from
 *  `createKeyedLazy`. When a cached vnode is reused across renders,
 *  snabbdom doesn't fire destroy, so the wrap stays registered and
 *  dispatches continue to route correctly. When the vnode is actually
 *  removed (entry deleted from a list, conditional render flips),
 *  destroy fires and the wrap is evicted: bounded memory, no leaks.
 *
 *  See `block.test.ts` for the cache-hit-survival and
 *  destroy-deregisters-wrap assertions. */
const withBoundaryCleanup = (
  vnode: VNode,
  registry: BoundaryRegistry,
  boundaryId: string,
  block: WrapBlock,
  mountOuterDispatch: DispatchSync,
): VNode => {
  const data = vnode.data ?? {}
  const hook = data.hook ?? {}
  const previousDestroy = hook.destroy
  const compositeDestroy = (removed: VNode): void => {
    deregisterBoundaryWrap(registry, boundaryId, block, mountOuterDispatch)
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
  return wrapped
}

/** Implementation behind `h.block`. Registers the child's boundary
 *  wrap, pushes the child boundary, and invokes the child's
 *  {@link BlockView} with the child-typed builder. Reached only
 *  through a builder's `block` method, which fixes `toParentMessage`'s
 *  return to the embedding frame's Message; the html factory passes the
 *  process-wide builder singleton as `htmlBuilderSingleton`. */
export const block = <View extends AnyBlockView>(
  config: BlockConfig<View, unknown>,
  htmlBuilderSingleton: HtmlBuilder<unknown, AnyMountHandler>,
): VNode | null => {
  // Snapshot the parent frame BEFORE pushing the child boundary. The
  // snapshot is captured into slot-callback closures by
  // `wrapViewInputsForOuterBoundary` so they can replay the parent's
  // full frame when invoked.
  const parentFrame = getCurrentFrame()
  const scope = config[ViewScopeTypeId]
  if (scope === undefined && parentFrame.viewIdentity !== undefined) {
    throw new Error(
      "[foldkit] Render child Blocks through a registered binding's embedView method.",
    )
  }
  if (
    scope !== undefined &&
    !parentFrame.viewIdentity?.childBindings.includes(scope.binding)
  ) {
    throw new Error(
      `[foldkit] Block binding "${scope.placement}" is not registered in this view's childBindings.`,
    )
  }
  const registry = parentFrame.boundaryRegistry
  const childBoundaryId = composeBoundary(parentFrame.boundaryId, config.slotId)
  let instance: ActiveInstance | undefined
  const block: WrapBlock = {
    toParentMessage:
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      config.toParentMessage as WrapBlock['toParentMessage'],
    ...(scope === undefined
      ? {}
      : { isCurrent: () => instance === undefined || instance.isActive }),
  }
  const transaction = beginBoundaryWrapTransaction(registry)
  try {
    registerBoundaryWrap(
      registry,
      childBoundaryId,
      block,
      parentFrame.mountOuterDispatch,
    )

    // NOTE: the builder handed to the child view is the process-wide
    // singleton retyped to the child's Message. The value carries no
    // Message state (dispatch resolves from the frame pushed below), so
    // the cast is the entire mechanism, exactly like the brand cast in
    // `defineView`.
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const childBuilder = htmlBuilderSingleton as unknown as HtmlBuilder<
      ViewMessageOf<View>,
      ViewMountRequirementsOf<View>
    >

    let vnode: VNode | null
    pushBoundary(
      childBoundaryId,
      scope?.placement,
      scope?.identity,
      scope === undefined
        ? undefined
        : {
            binding: scope.binding,
            ...(scope.key === undefined ? {} : { key: scope.key }),
          },
    )
    try {
      instance = Context.get(
        getCurrentFrame().runtimeContext,
        CurrentInstance,
      )?.node
      if (!Object.hasOwn(config, 'viewInputs')) {
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        const view = config.view as (
          model: ViewModelOf<View>,
          h: HtmlBuilder<ViewMessageOf<View>, ViewMountRequirementsOf<View>>,
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
          h: HtmlBuilder<ViewMessageOf<View>, ViewMountRequirementsOf<View>>,
        ) => VNode | null
        vnode = view(config.model, wrappedViewInputs, childBuilder)
      }
    } finally {
      clearRuntime()
    }

    if (vnode === null) {
      rollbackBoundaryWrapTransaction(registry, transaction)
      return null
    }

    const vnodeWithCleanup = withBoundaryCleanup(
      vnode,
      registry,
      childBoundaryId,
      block,
      parentFrame.mountOuterDispatch,
    )
    commitBoundaryWrapTransaction(registry, transaction)
    return vnodeWithCleanup
  } catch (error) {
    rollbackBoundaryWrapTransaction(registry, transaction)
    throw error
  }
}
