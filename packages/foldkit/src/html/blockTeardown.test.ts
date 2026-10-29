import { Context, Effect, Queue, Stream } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { defineMessageUnion } from '../message/index.js'
import type { MountAction } from '../mount/index.js'
import { MountTracker } from '../mount/index.js'
import { mountModule } from '../mountModule.js'
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
  mountModule,
  propsModule,
  styleModule,
])

const ChildMessage = defineMessageUnion({
  CompletedPortalPanel: {},
  BlurredPanel: {},
})
type ChildMessage = typeof ChildMessage.Type

const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
type ParentMessage = typeof ParentMessage.Type

const OuterMessage = defineMessageUnion({
  GotOuterMessage: { message: ParentMessage },
})
type OuterMessage = typeof OuterMessage.Type

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

describe('an event fired while a Block boundary is torn down', () => {
  it('reaches the parent when the listening element is the Block root', async () => {
    const h = __htmlBuilder<ParentMessage>()
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
          h.block({
            slotId: 'panel',
            model: {},
            view: panelView,
            toParentMessage: message =>
              ParentMessage.GotChildMessage({ message }),
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
        ParentMessage.GotChildMessage({
          message: ChildMessage.CompletedPortalPanel(),
        }),
      ])
    })

    patch(mounted, renderView(withoutPanel, dispatch, registry))

    expect(listenerErrors).toStrictEqual([])
    expect(dispatched).toStrictEqual([
      ParentMessage.GotChildMessage({
        message: ChildMessage.CompletedPortalPanel(),
      }),
      ParentMessage.GotChildMessage({
        message: ChildMessage.BlurredPanel(),
      }),
    ])
    expect(registry.wraps.has('panel')).toBe(false)
  })

  it('reaches the parent when the listening element is a descendant inside nested Blocks', async () => {
    const h = __htmlBuilder<OuterMessage>()
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
    const outerView = defineView<object, ParentMessage>((_model, outerHtml) =>
      outerHtml.article(
        [],
        [
          outerHtml.block({
            slotId: 'panel',
            model: {},
            view: panelView,
            toParentMessage: message =>
              ParentMessage.GotChildMessage({ message }),
          }),
        ],
      ),
    )
    const withPanel = () =>
      h.div(
        [],
        [
          h.block({
            slotId: 'outer',
            model: {},
            view: outerView,
            toParentMessage: message =>
              OuterMessage.GotOuterMessage({ message }),
          }),
        ],
      )
    const withoutPanel = () => h.div([])
    const completedPortalPanel = OuterMessage.GotOuterMessage({
      message: ParentMessage.GotChildMessage({
        message: ChildMessage.CompletedPortalPanel(),
      }),
    })

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
      OuterMessage.GotOuterMessage({
        message: ParentMessage.GotChildMessage({
          message: ChildMessage.BlurredPanel(),
        }),
      }),
    ])
    expect(registry.wraps.has('outer')).toBe(false)
    expect(registry.wraps.has('outer|panel')).toBe(false)
  })
})
