import { Context, Predicate } from 'effect'

import type { AnyAuthoredView } from '../html/block.js'
import {
  clearRuntime,
  getCurrentFrame,
  pushFrame,
} from '../html/runtimeSingleton.js'
import type { NamedIdentity, ViewIdentity } from './identity.js'
import {
  type ActiveInstance,
  CurrentInstance,
  type InstanceCursor,
  type InstanceKey,
} from './instanceContext.js'
import { invocationContext } from './scope.js'

declare const EmbeddedViewPlanTypeId: unique symbol

/** @internal A passive view whose selected executable graph is authenticated before embedding. */
export interface EmbeddedViewPlan<OwnerValue> {
  readonly [EmbeddedViewPlanTypeId]: (owner: OwnerValue) => OwnerValue
}

const embeddedViewCompilers = new WeakMap<object, (block: object) => object>()

/** @internal Registers compilation through the selected child's actual Composition. */
export const registerEmbeddedViewCompiler = (
  view: object,
  compile: (block: object) => object,
): void => {
  embeddedViewCompilers.set(view, compile)
}

/** @internal Resolves passive view plans before the native child boundary is installed. */
export const resolveEmbeddedView = <View>(block: object, view: View): View => {
  const compile =
    Predicate.isObject(view) || Predicate.isFunction(view)
      ? embeddedViewCompilers.get(view)
      : undefined

  if (compile === undefined) {
    return view
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return compile(block) as View
}

const viewsWithInputs = new WeakSet<object>()

/** @internal Retains whether an authored view requires caller-supplied inputs. */
export const registerViewInputs = (view: object, isRequired: boolean): void => {
  if (isRequired) {
    viewsWithInputs.add(view)
  }
}

/** @internal Reports whether an authored view requires caller-supplied inputs. */
export const requiresViewInputs = (view: object): boolean =>
  viewsWithInputs.has(view)

/** @internal Keeps a canonical view's declared graph available during rendering. */
export const withViewIdentity = <
  View extends (...args: ReadonlyArray<any>) => any,
>(
  owner: NamedIdentity,
  mounts: ReadonlyArray<object>,
  bindings: ReadonlyArray<object>,
  view: View,
): View => {
  const ownedView = (...args: ReadonlyArray<any>) => {
    const frame = getCurrentFrame()
    if (
      frame.viewIdentity !== undefined &&
      frame.viewIdentity.owner !== owner
    ) {
      throw new Error(
        "[foldkit] This view was defined by a different Block. Render it through that Block's binding.",
      )
    }
    if (
      frame.viewIdentity !== undefined &&
      mounts.some(mount => !frame.viewIdentity!.mounts.includes(mount))
    ) {
      throw new Error(
        '[foldkit] This view uses Mounts that are not registered in its selected Block.',
      )
    }
    if (
      frame.viewIdentity !== undefined &&
      bindings.some(
        childBinding => !frame.viewIdentity!.bindings.includes(childBinding),
      )
    ) {
      throw new Error(
        '[foldkit] This view uses child bindings that are not registered in its selected Block.',
      )
    }
    pushFrame({ ...frame, viewIdentity: { owner, mounts, bindings } })
    try {
      return view(...args)
    } finally {
      clearRuntime()
    }
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return ownedView as View
}

/** @internal Captures local capability aliases for Mounts inside a bound view. */
export const scopeView = <View extends AnyAuthoredView>(
  segment: string,
  view: View,
  identity?: ViewIdentity,
): View => {
  type CachedContext = Readonly<{
    cursor: InstanceCursor | undefined
    node: ActiveInstance | undefined
    generation: number | undefined
    key: InstanceKey | undefined
    resources: Context.Context<never> | undefined
    scoped: Context.Context<any>
  }>
  const cachedContexts = new WeakMap<Context.Context<never>, CachedContext>()

  const scopedView = (...args: ReadonlyArray<any>) => {
    const frame = getCurrentFrame()
    const cursor = Context.get(frame.runtimeContext, CurrentInstance)
    const node = cursor?.node
    const cached = cachedContexts.get(frame.runtimeContext)
    const isCachedContextCurrent =
      cached !== undefined &&
      cached.cursor === cursor &&
      cached.node === node &&
      cached.generation === node?.generation &&
      cached.key === node?.key &&
      cached.resources === node?.resources
    const scopedRuntimeContext = isCachedContextCurrent
      ? cached.scoped
      : invocationContext(segment, frame.runtimeContext)

    if (!isCachedContextCurrent) {
      cachedContexts.set(frame.runtimeContext, {
        cursor,
        node,
        generation: node?.generation,
        key: node?.key,
        resources: node?.resources,
        scoped: scopedRuntimeContext,
      })
    }

    pushFrame({
      ...frame,
      ...(identity === undefined ? {} : { viewIdentity: identity }),
      runtimeContext: scopedRuntimeContext,
      effectPath: [...(frame.effectPath ?? []), segment],
    })
    try {
      return view(...args)
    } finally {
      clearRuntime()
    }
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return scopedView as View
}
