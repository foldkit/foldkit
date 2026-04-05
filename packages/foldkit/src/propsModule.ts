import type { Module } from 'snabbdom'

/** A custom props module that extends snabbdom's built-in propsModule with
 *  proper cleanup of removed properties.
 *
 *  Snabbdom's propsModule only iterates over _new_ props — it never resets
 *  old props that disappeared between renders. This means `elm.disabled = true`
 *  persists even after `Disabled(true)` is removed from the attribute array.
 *  Since a disabled button swallows click events at the browser level, an
 *  `OnClick` handler that replaces `Disabled` at the same index silently fails.
 *
 *  This module adds a second loop (mirroring what snabbdom's attributesModule
 *  already does) that resets removed props to type-appropriate defaults:
 *  booleans → false, strings → '', numbers → 0. */
function updateProps(
  oldVnode: Parameters<NonNullable<Module['update']>>[0],
  vnode: Parameters<NonNullable<Module['update']>>[1],
): void {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const elm = vnode.elm as any
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let oldProps = (oldVnode.data as any)?.props as
    | Record<string, any>
    | undefined
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  let props = (vnode.data as any)?.props as Record<string, any> | undefined
  if (!oldProps && !props) {
    return
  }
  if (oldProps === props) {
    return
  }
  oldProps = oldProps ?? {}
  props = props ?? {}

  for (const key in props) {
    const cur = props[key]
    const old = oldProps[key]
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur
    }
  }

  for (const key in oldProps) {
    if (!(key in props)) {
      const old = oldProps[key]
      if (typeof old === 'boolean') {
        elm[key] = false
      } else if (typeof old === 'string') {
        elm[key] = ''
      } else if (typeof old === 'number') {
        elm[key] = 0
      }
    }
  }
}

export const propsModule: Module = { create: updateProps, update: updateProps }
