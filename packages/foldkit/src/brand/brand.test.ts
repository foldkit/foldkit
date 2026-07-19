import { Context, Effect } from 'effect'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createLazy } from '../html/lazy.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from '../html/runtimeSingleton.js'
import { MountTracker } from '../mount/index.js'
import { Dispatch } from '../runtime/index.js'
import { h } from '../snabbdom/index.js'
import { brandViewResult } from './brand.js'

describe('brandViewResult', () => {
  it('stamps identity on a bare vnode and returns the same reference', () => {
    const node = h('div', {}, ['content'])

    const result = brandViewResult(node, 'app/view:1')

    expect(result).toBe(node)
    expect(node.identity).toBe('app/view:1')
  })

  it('leaves an existing identity untouched', () => {
    const node = h('div')
    brandViewResult(node, 'first')

    brandViewResult(node, 'second')

    expect(node.identity).toBe('first')
  })

  it('is a no-op when branding twice with the same identity', () => {
    const node = h('div')

    brandViewResult(node, 'stable')
    brandViewResult(node, 'stable')

    expect(node.identity).toBe('stable')
  })

  it('stamps every vnode element of an array with the same identity', () => {
    const first = h('span')
    const second = h('em')
    const elements = [first, 'text', second]

    const result = brandViewResult(elements, 'row')

    expect(result).toBe(elements)
    expect(first.identity).toBe('row')
    expect(second.identity).toBe('row')
  })

  it('passes through strings, null, and non-vnode objects untouched', () => {
    expect(brandViewResult('hello', 'x')).toBe('hello')
    expect(brandViewResult(null, 'x')).toBeNull()
    expect(brandViewResult(undefined, 'x')).toBeUndefined()

    const numericSel = { sel: 42, data: {} }
    expect(brandViewResult(numericSel, 'x')).toBe(numericSel)
    expect('identity' in numericSel).toBe(false)

    const missingData = { sel: 'div' }
    expect(brandViewResult(missingData, 'x')).toBe(missingData)
    expect('identity' in missingData).toBe(false)
  })

  it('leaves application data with only sel and data fields untouched', () => {
    const applicationData = Object.freeze({ sel: 'header', data: { rows: 3 } })

    const result = brandViewResult(applicationData, 'x')

    expect(result).toBe(applicationData)
    expect('identity' in applicationData).toBe(false)
  })

  describe('with memoized view results', () => {
    const noOpDispatchSync: DispatchSync = () => {}

    const noOpDispatchService = Dispatch.of({
      dispatchAsync: () => Effect.void,
      dispatchSync: noOpDispatchSync,
    })

    const noOpContext = Context.make(Dispatch, noOpDispatchService).pipe(
      Context.add(MountTracker, {
        started: () => {},
        ended: () => {},
      }),
    )

    beforeEach(() => {
      setRuntime(noOpDispatchSync, noOpContext)
    })

    afterEach(() => {
      clearRuntime()
    })

    it('brands a memoized vnode without breaking cache identity', () => {
      const view = (label: string) => h('div', {}, [label])
      const lazy = createLazy()

      const first = lazy(view, ['x'])
      expect(first).not.toBeNull()
      brandViewResult(first, 'memo/site')
      expect(first?.identity).toBe('memo/site')

      const second = lazy(view, ['x'])
      expect(second).toBe(first)

      brandViewResult(second, 'other/site')
      expect(second?.identity).toBe('memo/site')
    })
  })
})
