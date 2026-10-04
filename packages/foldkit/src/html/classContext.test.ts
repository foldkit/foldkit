import { Context, Stream } from 'effect'
import { describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { onUnmountModule } from '../onUnmountModule.js'
import { VNodeDataMask, vnodeDataMaskKey } from '../snabbdom/vnode.js'
import { childAttributes } from './childAttribute.js'
import { __htmlBuilder, inertHtml } from './index.js'
import { clearRuntime, setRuntime } from './runtimeSingleton.js'

const Message = defineMessageUnion({
  ClickedButton: {},
  CompletedObserveButton: {},
  UnmountedButton: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

describe('Class Attribute context', () => {
  it('preserves Class data shape, cache identity and last-write behavior outside a frame', () => {
    const first = inertHtml.div([inertHtml.Class('first')])
    const overwritten = inertHtml.div([
      inertHtml.Class('first'),
      inertHtml.Class('second active'),
    ])
    const sameClass = inertHtml.div([inertHtml.Class('second active')])

    expect(first?.data).toEqual({
      [vnodeDataMaskKey]: VNodeDataMask.Class,
      class: { first: true },
    })
    expect(overwritten?.data).toEqual({
      [vnodeDataMaskKey]: VNodeDataMask.Class,
      class: { second: true, active: true },
    })
    expect(overwritten?.data?.class).toBe(sameClass?.data?.class)
    expect(overwritten?.children).toEqual([])
    expect(overwritten?.children).not.toBe(sameClass?.children)
  })

  it('reads a generic Attribute tag exactly once', () => {
    const attribute = inertHtml.Id('identity')
    let reads = 0
    Object.defineProperty(attribute, '_tag', {
      get: () => {
        reads += 1
        return 'Id'
      },
    })

    const node = inertHtml.div([attribute])

    expect(reads).toBe(1)
    expect(node?.data?.props?.['id']).toBe('identity')
  })

  it.each([false, true])(
    'keeps controlled-property order when child attributes come first: %s',
    isChildFirst => {
      setRuntime(() => {}, Context.empty())

      try {
        const child = childAttributes([
          h.Value('child-first'),
          h.Checked(true),
          h.Value('child-last'),
        ])
        const parent = [h.Value('parent-first'), h.Checked(false)]
        const interleaved = isChildFirst
          ? [...child, ...parent]
          : [...parent, ...child]
        const node = h.input([
          h.Class('controlled'),
          ...interleaved,
          h.Checked(false),
          h.Value('parent-last'),
        ])
        const element = document.createElement('input')
        const setterCalls: Array<string> = []
        let value = ''
        let isChecked = false

        Object.defineProperties(element, {
          value: {
            configurable: true,
            get: () => value,
            set: (nextValue: string) => {
              setterCalls.push(`value:${nextValue}`)
              value = nextValue
            },
          },
          checked: {
            configurable: true,
            get: () => isChecked,
            set: (nextChecked: boolean) => {
              setterCalls.push(`checked:${String(nextChecked)}`)
              isChecked = nextChecked
            },
          },
        })

        if (node === null || node.data?.hook?.insert === undefined) {
          throw new Error(
            'Expected controlled attributes to attach an insert hook',
          )
        }

        node.elm = element
        node.data.hook.insert(node)

        const childCalls = [
          'value:child-first',
          'checked:true',
          'value:child-last',
        ]
        const parentCalls = ['value:parent-first']
        const orderedCalls = isChildFirst
          ? [...childCalls, ...parentCalls, 'checked:false']
          : [...parentCalls, ...childCalls, 'checked:false']

        expect(setterCalls).toEqual([...orderedCalls, 'value:parent-last'])
      } finally {
        clearRuntime()
      }
    },
  )

  it.each(['_tag', 'value'])(
    'keeps the first frame when a Class %s getter changes it',
    field => {
      const outerMessages: Array<unknown> = []
      const innerMessages: Array<unknown> = []
      const attribute = h.Class('outer')
      let reads = 0
      Object.defineProperty(attribute, field, {
        get: () => {
          reads += 1
          setRuntime(message => innerMessages.push(message), Context.empty())
          return field === '_tag' ? 'Class' : 'outer'
        },
      })
      setRuntime(message => outerMessages.push(message), Context.empty())

      try {
        const click = Message.ClickedButton()
        const unmount = Message.UnmountedButton()
        const node = h.button([
          attribute,
          h.OnClick(click),
          h.OnUnmount(unmount),
        ])
        const clickHandler = node?.data?.on?.click

        if (node === null || typeof clickHandler !== 'function') {
          throw new Error('Expected a button click handler')
        }

        clickHandler.call(node, new PointerEvent('click'), node)
        onUnmountModule.destroy?.(node)

        expect(reads).toBe(1)
        expect(outerMessages).toEqual([click, unmount])
        expect(innerMessages).toEqual([])
      } finally {
        for (let index = 0; index < reads; index += 1) {
          clearRuntime()
        }
        clearRuntime()
      }
    },
  )

  it('keeps the no-frame fallback when a Class getter introduces a frame', () => {
    const messages: Array<unknown> = []
    const attribute = h.Class('static')
    Object.defineProperty(attribute, 'value', {
      get: () => {
        setRuntime(message => messages.push(message), Context.empty())
        return 'static'
      },
    })

    try {
      const node = h.button([attribute, h.OnClick(Message.ClickedButton())])
      const clickHandler = node?.data?.on?.click

      if (node === null || typeof clickHandler !== 'function') {
        throw new Error('Expected a button click handler')
      }

      expect(() =>
        clickHandler.call(node, new PointerEvent('click'), node),
      ).toThrow('without an active runtime frame')
      expect(messages).toEqual([])
    } finally {
      clearRuntime()
    }
  })

  it('captures the current Mount Context and resolver after a Class getter changes frames', async () => {
    const outerMessages: Array<unknown> = []
    const innerMessages: Array<unknown> = []
    const outerLifecycle: Array<string> = []
    const innerLifecycle: Array<string> = []
    const outerContext = Context.make(MountTracker, {
      started: name => outerLifecycle.push(`started:${name}`),
      ended: name => outerLifecycle.push(`ended:${name}`),
    })
    const innerContext = Context.make(MountTracker, {
      started: name => innerLifecycle.push(`started:${name}`),
      ended: name => innerLifecycle.push(`ended:${name}`),
    })
    const attribute = h.Class('mounted')
    let reads = 0

    Object.defineProperty(attribute, 'value', {
      get: () => {
        reads += 1
        setRuntime(message => innerMessages.push(message), innerContext)
        return 'mounted'
      },
    })
    setRuntime(message => outerMessages.push(message), outerContext)

    try {
      const mounted = Message.CompletedObserveButton()
      const node = h.button([
        attribute,
        h.OnMount({ name: 'ObserveButton', f: () => Stream.make(mounted) }),
      ])

      if (node === null || node.data?.hook?.insert === undefined) {
        throw new Error('Expected a Mount insert hook')
      }

      node.elm = document.createElement('button')

      try {
        node.data.hook.insert(node)
        await vi.waitFor(() => expect(innerMessages).toEqual([mounted]))

        expect(reads).toBe(1)
        expect(innerLifecycle).toEqual(['started:ObserveButton'])
        expect(outerMessages).toEqual([])
        expect(outerLifecycle).toEqual([])
      } finally {
        node.data.hook.destroy?.(node)
      }

      expect(innerLifecycle).toEqual([
        'started:ObserveButton',
        'ended:ObserveButton',
      ])
    } finally {
      for (let index = 0; index < reads; index += 1) {
        clearRuntime()
      }
      clearRuntime()
    }
  })
})
