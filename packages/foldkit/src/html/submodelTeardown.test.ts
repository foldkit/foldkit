import { Context, Effect, Queue, Stream } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { onUnmountModule } from '../onUnmountModule.js'
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
import type { BoundaryRegistry } from './boundary.js'
import {
  __htmlBuilder,
  __beginRender as beginHtmlRender,
  __clearRuntime as clearHtmlRuntime,
  __createBoundaryRegistry as createHtmlBoundaryRegistry,
  defineView,
  __setRuntime as setHtmlRuntime,
} from './index.js'

const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  onUnmountModule,
  propsModule,
  styleModule,
])

const ChildMessage = defineMessageUnion({
  CompletedPortalPanel: {},
  BlurredPanel: {},
})
type ChildMessage = typeof ChildMessage.Type

type GotChildMessage = Readonly<{
  _tag: 'GotChildMessage'
  message: ChildMessage
}>
const GotChildMessage = (message: ChildMessage): GotChildMessage => ({
  _tag: 'GotChildMessage',
  message,
})

type GotOuterMessage = Readonly<{
  _tag: 'GotOuterMessage'
  message: GotChildMessage
}>
const GotOuterMessage = (message: GotChildMessage): GotOuterMessage => ({
  _tag: 'GotOuterMessage',
  message,
})

// NOTE: Chromium fires `blur` on a focused element when that element leaves
// the document. happy-dom does not, so the release fires the event itself.
const makePortalPanel = (
  listenerErrors: Array<unknown>,
): MountAction<typeof ChildMessage.CompletedPortalPanel.Type> => ({
  name: 'PortalPanel',
  f: element =>
    Stream.callback<typeof ChildMessage.CompletedPortalPanel.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            Queue.offerUnsafe(queue, ChildMessage.CompletedPortalPanel())
          }),
          () =>
            Effect.sync(() => {
              element.remove()
              try {
                element.dispatchEvent(new FocusEvent('blur'))
              } catch (error) {
                listenerErrors.push(error)
              }
            }),
        )
        return yield* Effect.never
      }),
    ),
})

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
  buildView: () => VNode | null,
  dispatch: typeof Dispatch.Service,
  registry: BoundaryRegistry,
): VNode => {
  const testContext = Context.make(Dispatch, dispatch).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

  beginHtmlRender(registry)
  setHtmlRuntime(dispatch.dispatchSync, testContext, registry)
  let vnode: VNode | null
  try {
    vnode = buildView()
  } finally {
    clearHtmlRuntime()
  }

  if (vnode === null) {
    throw new Error('renderView received a null VNode')
  }
  return vnode
}

const mountedContainer = (): HTMLElement => {
  const container = document.createElement('div')
  document.body.append(container)
  return container
}

describe('an event fired while a Submodel boundary is torn down', () => {
  it('reaches the parent when the listening element is the Submodel root', async () => {
    const h = __htmlBuilder<GotChildMessage>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const registry = createHtmlBoundaryRegistry()
    const listenerErrors: Array<unknown> = []
    const portalPanel = makePortalPanel(listenerErrors)

    const panelView = defineView<object, ChildMessage>((_model, childHtml) =>
      childHtml.div([
        childHtml.OnMount(portalPanel),
        childHtml.OnBlur(ChildMessage.BlurredPanel()),
      ]),
    )
    const withPanel = () =>
      h.div(
        [],
        [
          h.submodel({
            slotId: 'panel',
            model: {},
            view: panelView,
            toParentMessage: GotChildMessage,
          }),
        ],
      )
    const withoutPanel = () => h.div([])

    const mounted = patch(
      toVNode(mountedContainer()),
      renderView(withPanel, dispatch, registry),
    )
    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([
        GotChildMessage(ChildMessage.CompletedPortalPanel()),
      ])
    })

    patch(mounted, renderView(withoutPanel, dispatch, registry))

    expect(listenerErrors).toStrictEqual([])
    expect(dispatched).toStrictEqual([
      GotChildMessage(ChildMessage.CompletedPortalPanel()),
      GotChildMessage(ChildMessage.BlurredPanel()),
    ])
    expect(registry.wraps.has('panel')).toBe(false)
  })

  it('reaches the parent when the listening element is a descendant inside nested Submodels', async () => {
    const h = __htmlBuilder<GotOuterMessage>()
    const { dispatch, dispatched } = createCapturingDispatch()
    const registry = createHtmlBoundaryRegistry()
    const listenerErrors: Array<unknown> = []
    const portalPanel = makePortalPanel(listenerErrors)

    const panelView = defineView<object, ChildMessage>((_model, childHtml) =>
      childHtml.section(
        [],
        [
          childHtml.div([
            childHtml.OnMount(portalPanel),
            childHtml.OnBlur(ChildMessage.BlurredPanel()),
          ]),
        ],
      ),
    )
    const outerView = defineView<object, GotChildMessage>((_model, outerHtml) =>
      outerHtml.article(
        [],
        [
          outerHtml.submodel({
            slotId: 'panel',
            model: {},
            view: panelView,
            toParentMessage: GotChildMessage,
          }),
        ],
      ),
    )
    const withPanel = () =>
      h.div(
        [],
        [
          h.submodel({
            slotId: 'outer',
            model: {},
            view: outerView,
            toParentMessage: GotOuterMessage,
          }),
        ],
      )
    const withoutPanel = () => h.div([])
    const completedPortalPanel = GotOuterMessage(
      GotChildMessage(ChildMessage.CompletedPortalPanel()),
    )

    const mounted = patch(
      toVNode(mountedContainer()),
      renderView(withPanel, dispatch, registry),
    )
    await vi.waitFor(() => {
      expect(dispatched).toStrictEqual([completedPortalPanel])
    })

    patch(mounted, renderView(withoutPanel, dispatch, registry))

    expect(listenerErrors).toStrictEqual([])
    expect(dispatched).toStrictEqual([
      completedPortalPanel,
      GotOuterMessage(GotChildMessage(ChildMessage.BlurredPanel())),
    ])
    expect(registry.wraps.has('outer')).toBe(false)
    expect(registry.wraps.has('outer|panel')).toBe(false)
  })
})
