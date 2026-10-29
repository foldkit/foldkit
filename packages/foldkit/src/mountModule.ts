import type { Module } from './snabbdom/index.js'

const mountCleanups = new WeakMap<Element, () => void>()

/** Registers the active Mount cleanup for an element until it is destroyed. */
export const registerMountCleanup = (
  element: Element,
  cleanup: () => void,
): void => {
  mountCleanups.set(element, cleanup)
}

/** Runs and forgets the active Mount cleanup for an element, if present. */
export const cleanupMount = (element: Element): void => {
  const cleanup = mountCleanups.get(element)
  if (cleanup !== undefined) {
    mountCleanups.delete(element)
    cleanup()
  }
}

/** Releases active Mount lifecycles when Snabbdom destroys their elements. */
export const mountModule: Module = {
  destroy: vnode => {
    if (vnode.elm instanceof Element) {
      cleanupMount(vnode.elm)
    }
  },
}
