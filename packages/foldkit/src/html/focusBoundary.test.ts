import { Context, Effect } from 'effect'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from '../snabbdom/index.js'
import type { VNode } from '../vdom.js'
import {
  DEVTOOLS_HOST_ID,
  __htmlBuilder,
  __clearRuntime as clearHtmlRuntime,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const Message = defineMessageUnion({
  EnteredFocusRegion: {},
  LeftFocusRegion: {},
})
type Message = typeof Message.Type

const createCapturingDispatch = () => {
  const dispatched: Array<unknown> = []
  const dispatch = Dispatch.of({
    dispatchAsync: () => Effect.void,
    dispatchSync: message => {
      dispatched.push(message)
    },
  })
  return { dispatch, dispatched }
}

const renderView = (
  build: () => VNode | null,
  dispatch: typeof Dispatch.Service,
): VNode => {
  const context = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  setHtmlRuntime(dispatch.dispatchSync, context)
  let vnode: VNode | null
  try {
    vnode = build()
  } finally {
    clearHtmlRuntime()
  }
  if (vnode === null) {
    throw new Error('renderView received a null VNode')
  }
  return vnode
}

const patchInto = (vnode: VNode): Element => {
  const patched = patch(toVNode(document.createElement('div')), vnode)
  if (!(patched.elm instanceof Element)) {
    throw new Error('patch did not produce an Element')
  }
  return patched.elm
}

const requireElement = (element: Element | null): Element => {
  if (element === null) {
    throw new Error('expected an Element')
  }
  return element
}

const dispatchFocusEvent = (
  target: Element,
  eventName: 'focusin' | 'focusout',
  relatedTarget: EventTarget | null,
): void => {
  target.dispatchEvent(
    new FocusEvent(eventName, { bubbles: true, relatedTarget }),
  )
}

const renderFocusRegion = (
  dispatch: typeof Dispatch.Service,
): Readonly<{ region: Element; first: Element; second: Element }> => {
  const h = __htmlBuilder<Message>()
  const region = patchInto(
    renderView(
      () =>
        h.div(
          [
            h.OnFocusEnter(Message.EnteredFocusRegion()),
            h.OnFocusLeave(Message.LeftFocusRegion()),
          ],
          [
            h.button([h.Id('first')], ['First']),
            h.button([h.Id('second')], ['Second']),
          ],
        ),
      dispatch,
    ),
  )

  return {
    region,
    first: requireElement(region.querySelector('#first')),
    second: requireElement(region.querySelector('#second')),
  }
}

describe('focus boundary attributes', () => {
  it('dispatches when focus enters the region from outside', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first } = renderFocusRegion(dispatch)
    const outside = document.createElement('button')

    dispatchFocusEvent(first, 'focusin', outside)

    expect(dispatched).toStrictEqual([Message.EnteredFocusRegion()])
  })

  it('dispatches when focus enters without a related target', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first } = renderFocusRegion(dispatch)

    dispatchFocusEvent(first, 'focusin', null)

    expect(dispatched).toStrictEqual([Message.EnteredFocusRegion()])
  })

  it('does not dispatch while focus moves between descendants', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first, second } = renderFocusRegion(dispatch)

    dispatchFocusEvent(first, 'focusout', second)
    dispatchFocusEvent(second, 'focusin', first)

    expect(dispatched).toStrictEqual([])
  })

  it('dispatches when focus leaves the region', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first } = renderFocusRegion(dispatch)
    const outside = document.createElement('button')

    dispatchFocusEvent(first, 'focusout', outside)

    expect(dispatched).toStrictEqual([Message.LeftFocusRegion()])
  })

  it('dispatches when focus leaves without a related target', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first } = renderFocusRegion(dispatch)

    dispatchFocusEvent(first, 'focusout', null)

    expect(dispatched).toStrictEqual([Message.LeftFocusRegion()])
  })

  it('treats DevTools as outside the region', () => {
    const { dispatch, dispatched } = createCapturingDispatch()
    const { first } = renderFocusRegion(dispatch)
    const outside = document.createElement('button')
    const devToolsHost = document.createElement('div')
    devToolsHost.id = DEVTOOLS_HOST_ID

    dispatchFocusEvent(first, 'focusin', outside)
    dispatchFocusEvent(first, 'focusout', devToolsHost)
    dispatchFocusEvent(first, 'focusin', devToolsHost)

    expect(dispatched).toStrictEqual([
      Message.EnteredFocusRegion(),
      Message.LeftFocusRegion(),
      Message.EnteredFocusRegion(),
    ])
  })
})
