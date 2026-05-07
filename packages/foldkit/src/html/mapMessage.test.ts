import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  styleModule,
  toVNode,
} from 'snabbdom'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { m } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { propsModule } from '../propsModule.js'
import { Dispatch } from '../runtime/index.js'
import type { VNode } from '../vdom.js'
import { type Html, html, mapMessage } from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])

const ChildClicked = m('ChildClicked')
const ChildHovered = m('ChildHovered')
const ChildMounted = m('ChildMounted')
type ChildMessage =
  | typeof ChildClicked.Type
  | typeof ChildHovered.Type
  | typeof ChildMounted.Type

const GotChildMessage = m('GotChildMessage', { child: ChildClicked })
const GrandparentWrap = m('GrandparentWrap', { wrapped: GotChildMessage })

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
  view: Html<unknown>,
  dispatch: typeof Dispatch.Service,
): VNode => {
  const maybeVNode = Effect.runSync(
    Effect.provideService(view, Dispatch, dispatch),
  )
  if (maybeVNode === null) {
    throw new Error('renderView received a null VNode')
  }
  return maybeVNode
}

const childAt = (vnode: VNode, index: number): VNode => {
  const child = (vnode.children ?? [])[index]
  if (child === undefined || typeof child === 'string') {
    throw new Error(`Expected VNode child at index ${index}`)
  }
  return child
}

const asButton = (vnode: VNode): HTMLButtonElement => {
  if (!(vnode.elm instanceof HTMLButtonElement)) {
    throw new Error('Expected vnode to wrap an HTMLButtonElement')
  }
  return vnode.elm
}

describe('Html.mapMessage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('wraps a child-dispatched click Message through toParentMessage', () => {
    const { button, OnClick } = html<typeof ChildClicked.Type>()
    const childView: Html<typeof ChildClicked.Type> = button(
      [OnClick(ChildClicked())],
      ['click me'],
    )

    const parentView = mapMessage((child: typeof ChildClicked.Type) =>
      GotChildMessage({ child }),
    )(childView)

    const { dispatch, dispatched } = createCapturingDispatch()
    const vnode = renderView(parentView, dispatch)
    const container = document.createElement('div')
    patch(toVNode(container), vnode)

    asButton(vnode).click()

    expect(dispatched).toStrictEqual([
      GotChildMessage({ child: ChildClicked() }),
    ])
  })

  it('wraps Messages from every event handler in the child subtree', () => {
    const { div, button, OnClick, OnMouseEnter } = html<ChildMessage>()
    const childView: Html<ChildMessage> = div(
      [],
      [
        button([OnClick(ChildClicked())], ['click']),
        button([OnMouseEnter(ChildHovered())], ['hover']),
      ],
    )

    const parentView = mapMessage(
      (
        child:
          | typeof ChildClicked.Type
          | typeof ChildHovered.Type
          | typeof ChildMounted.Type,
      ) => ({ _tag: 'Wrapped' as const, child }),
    )(childView)

    const { dispatch, dispatched } = createCapturingDispatch()
    const vnode = renderView(parentView, dispatch)
    patch(toVNode(document.createElement('div')), vnode)

    asButton(childAt(vnode, 0)).click()
    asButton(childAt(vnode, 1)).dispatchEvent(new MouseEvent('mouseenter'))

    expect(dispatched).toStrictEqual([
      { _tag: 'Wrapped', child: ChildClicked() },
      { _tag: 'Wrapped', child: ChildHovered() },
    ])
  })

  it('composes through nested mapMessage calls', () => {
    const { button, OnClick } = html<typeof ChildClicked.Type>()
    const childView: Html<typeof ChildClicked.Type> = button(
      [OnClick(ChildClicked())],
      ['click'],
    )

    const parentView = mapMessage((child: typeof ChildClicked.Type) =>
      GotChildMessage({ child }),
    )(childView)

    const grandparentView = mapMessage((wrapped: typeof GotChildMessage.Type) =>
      GrandparentWrap({ wrapped }),
    )(parentView)

    const { dispatch, dispatched } = createCapturingDispatch()
    const vnode = renderView(grandparentView, dispatch)
    patch(toVNode(document.createElement('div')), vnode)
    asButton(vnode).click()

    expect(dispatched).toStrictEqual([
      GrandparentWrap({
        wrapped: GotChildMessage({ child: ChildClicked() }),
      }),
    ])
  })

  it('wraps OnMount result Messages through toParentMessage', async () => {
    const Mounted = Mount.define('Mounted', ChildMounted)
    const { div, span, OnMount } = html<typeof ChildMounted.Type>()
    const childView: Html<typeof ChildMounted.Type> = div(
      [],
      [
        span(
          [
            OnMount(
              Mounted(() =>
                Effect.succeed({
                  message: ChildMounted(),
                  cleanup: () => {},
                }),
              ),
            ),
          ],
          [],
        ),
      ],
    )

    const parentView = mapMessage((child: typeof ChildMounted.Type) => ({
      _tag: 'Wrapped' as const,
      child,
    }))(childView)

    const { dispatch, dispatched } = createCapturingDispatch()
    const vnode = renderView(parentView, dispatch)
    patch(toVNode(document.createElement('div')), vnode)

    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([
        { _tag: 'Wrapped', child: ChildMounted() },
      ])
    })
  })

  it('does not affect sibling subtrees outside the mapped child', () => {
    const ParentClicked = m('ParentClicked')
    type ParentMessage =
      | typeof ParentClicked.Type
      | { readonly _tag: 'Wrapped'; readonly child: ChildMessage }

    const childHtml = html<ChildMessage>()
    const childButton: Html<ChildMessage> = childHtml.button(
      [childHtml.OnClick(ChildClicked())],
      ['child'],
    )
    const wrappedChild = mapMessage((child: ChildMessage) => ({
      _tag: 'Wrapped' as const,
      child,
    }))(childButton)

    const { div, button, OnClick } = html<ParentMessage>()
    const parentView: Html<ParentMessage> = div(
      [],
      [button([OnClick(ParentClicked())], ['parent']), wrappedChild],
    )

    const { dispatch, dispatched } = createCapturingDispatch()
    const vnode = renderView(parentView, dispatch)
    patch(toVNode(document.createElement('div')), vnode)

    asButton(childAt(vnode, 0)).click()
    asButton(childAt(vnode, 1)).click()

    expect(dispatched).toStrictEqual([
      ParentClicked(),
      { _tag: 'Wrapped', child: ChildClicked() },
    ])
  })
})
