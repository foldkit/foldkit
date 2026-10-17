import type { AnyAuthoredView } from '../html/block.js'
import {
  clearRuntime,
  getCurrentFrame,
  pushFrame,
} from '../html/runtimeSingleton.js'
import type { NamedIdentity, ViewIdentity } from './identity.js'
import { invocationContext } from './scope.js'

/** @internal Keeps a canonical view's declared graph available during rendering. */
export const withViewIdentity = <
  View extends (...args: ReadonlyArray<any>) => any,
>(
  owner: NamedIdentity,
  mounts: ReadonlyArray<object>,
  childBindings: ReadonlyArray<object>,
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
      childBindings.some(
        childBinding =>
          !frame.viewIdentity!.childBindings.includes(childBinding),
      )
    ) {
      throw new Error(
        '[foldkit] This view uses child bindings that are not registered in its selected Block.',
      )
    }
    pushFrame({ ...frame, viewIdentity: { owner, mounts, childBindings } })
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
  const scopedView = (...args: ReadonlyArray<any>) => {
    const frame = getCurrentFrame()
    pushFrame({
      ...frame,
      ...(identity === undefined ? {} : { viewIdentity: identity }),
      runtimeContext: invocationContext(segment, frame.runtimeContext),
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
