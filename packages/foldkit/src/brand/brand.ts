import type { VNode } from '../snabbdom/index.js'

const isVNode = (value: unknown): value is VNode =>
  typeof value === 'object' &&
  value !== null &&
  'sel' in value &&
  typeof value.sel === 'string' &&
  'data' in value &&
  'children' in value &&
  'text' in value &&
  'elm' in value &&
  'key' in value

const stampIdentity = (target: VNode, identity: string): void => {
  if (target.identity === undefined) {
    target.identity = identity
  }
}

/**
 * Stamps a framework-managed identity onto a view result.
 *
 * Identity is the differ's second axis, independent of user-facing keys: it
 * answers "which view arm produced this node" rather than "which sibling is
 * this". Identity never enters the keyed index; it joins the differ's
 * compatibility check exactly where the selector is consulted, so an identity
 * mismatch replaces the node instead of patching it, and switching between
 * conditional view arms tears down the old subtree even when both arms render
 * the same tag.
 *
 * Stamping is set-if-absent and mutates the vnode in place: a vnode that
 * already carries an identity (including a memoized vnode returned from a
 * cache) is left untouched, so branding is idempotent and never breaks
 * reference equality that the renderer relies on. Vnodes are stamped directly;
 * for an array result each vnode element is stamped with the same identity.
 * Any other value passes through unchanged.
 *
 * `@foldkit/vite-plugin` injects a call to this around every function return
 * in application modules at build time, so identity attaches at view-function
 * boundaries regardless of the branching syntax that selected the function.
 * Application code does not call it by hand.
 */
export const brandViewResult = <A>(result: A, identity: string): A => {
  if (isVNode(result)) {
    stampIdentity(result, identity)
  } else if (Array.isArray(result)) {
    for (const element of result) {
      if (isVNode(element)) {
        stampIdentity(element, identity)
      }
    }
  }
  return result
}
