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
 *  Instead of relying on the old vnode's `data.props` for cleanup (which
 *  requires snabbdom to patch rather than recreate), this module tracks which
 *  properties it has set on each DOM element via a WeakMap. On every create or
 *  update hook, it compares the tracked set against the new vnode's props and
 *  resets anything that was removed to its type-appropriate default: booleans →
 *  false, strings → '', numbers → 0. The WeakMap entries are garbage-collected
 *  when the element is removed from the DOM. */
const managedProps = new WeakMap<Element, Record<string, unknown>>()

function updateProps(
  _oldVnode: Parameters<NonNullable<Module['update']>>[0],
  vnode: Parameters<NonNullable<Module['update']>>[1],
): void {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const elm = vnode.elm as any
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const props = ((vnode.data as any)?.props ?? {}) as Record<string, unknown>
  const previous = managedProps.get(elm) ?? {}

  if (props === previous) {
    return
  }

  for (const key in props) {
    const cur = props[key]
    const old = previous[key]
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur
    }
  }

  for (const key in previous) {
    if (!(key in props)) {
      const old = previous[key]
      if (typeof old === 'boolean') {
        elm[key] = false
      } else if (typeof old === 'string') {
        elm[key] = ''
      } else if (typeof old === 'number') {
        elm[key] = 0
      }
    }
  }

  managedProps.set(elm, { ...props })
}

export const propsModule: Module = { create: updateProps, update: updateProps }
