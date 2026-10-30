import { Context, Number, Schema } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { MountTracker } from '../mount/index.js'
import { isClientOnlyProperty } from '../propertyProvenance.js'
import { Dispatch, embed, makeElement } from '../runtime/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { beginRender, createBoundaryRegistry } from './boundary.js'
import * as HtmlModule from './index.js'
import {
  type Html,
  type HtmlBuilder,
  __htmlBuilder,
  createLazy,
  inertHtml,
} from './index.js'
import * as HtmlPublicModule from './public.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './runtimeSingleton.js'

const ChildMessage = defineMessageUnion({
  ClickedChild: { value: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type

const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: ChildMessage },
})
type ParentMessage = typeof ParentMessage.Type

const AppMessage = defineMessageUnion({
  ClickedApp: {},
})
type AppMessage = typeof AppMessage.Type

const runtimeContext = (dispatchSync: DispatchSync) =>
  Context.make(
    Dispatch,
    Dispatch.of({
      dispatchAsync: () =>
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
        Promise.resolve() as unknown as ReturnType<
          typeof Dispatch.Service.dispatchAsync
        >,
      dispatchSync,
    }),
  ).pipe(
    Context.add(MountTracker, {
      started: () => {},
      ended: () => {},
    }),
  )

// TYPE GUARANTEES
//
// The @ts-expect-error directives below are the assertions: `pnpm typecheck`
// fails if any of them stops erroring, i.e. if a foreign Message ever
// becomes expressible again without a cast.

describe('HtmlBuilder type guarantees', () => {
  it('rejects a Message from another universe at the handler call site', () => {
    const childViewWithForeignMessage = (h: HtmlBuilder<ChildMessage>): Html =>
      h.button(
        [
          // @ts-expect-error an app-level Message is not part of this Block's union
          h.OnClick(AppMessage.ClickedApp()),
        ],
        ['x'],
      )
    expect(typeof childViewWithForeignMessage).toBe('function')
  })

  it('rejects passing a child builder to a helper typed for the app builder', () => {
    const appHeaderView = (h: HtmlBuilder<AppMessage>): Html =>
      h.button([h.OnClick(AppMessage.ClickedApp())], ['header'])

    const childViewUsingAppHelper = (h: HtmlBuilder<ChildMessage>): Html =>
      // @ts-expect-error the child frame's builder is not the app builder
      appHeaderView(h)
    expect(typeof childViewUsingAppHelper).toBe('function')
  })

  it('refuses handler construction on inertHtml', () => {
    // @ts-expect-error inertHtml's Message is never, so no handler is expressible
    inertHtml.OnClick(AppMessage.ClickedApp())
    expect(inertHtml.empty).toBeNull()
  })

  it('rejects children on a void element', () => {
    // @ts-expect-error a void element takes attributes only
    const imgWithChildren = () => inertHtml.img([inertHtml.Src('logo.png')], []) // oxlint-disable-line foldkit/no-empty-children-array -- the rejected call is the assertion
    expect(imgWithChildren).toBeTypeOf('function')
  })

  it('restricts textarea content ownership on direct and keyed builders', () => {
    if (false) {
      // @ts-expect-error textarea content must be set with h.Value
      inertHtml.textarea([], ['default'])

      // @ts-expect-error textarea content must be set with h.Value
      inertHtml.keyed('textarea')('draft', [], ['default'])

      inertHtml.textarea([
        // @ts-expect-error textarea content must be set with h.Value
        inertHtml.InnerHTML('<b>default</b>'),
      ])

      inertHtml.keyed('textarea')('draft', [
        // @ts-expect-error textarea content must be set with h.Value
        inertHtml.InnerHTML('<b>default</b>'),
      ])
    }
  })

  it('rejects an element builder call that omits attributes', () => {
    // @ts-expect-error children are optional, attributes are not
    const divWithoutAttributes = () => inertHtml.div()
    expect(divWithoutAttributes).toBeTypeOf('function')
  })
})

// RUNTIME GUARANTEES

describe('HtmlBuilder runtime guarantees', () => {
  it('keeps a typed property client-only where the element does not reflect it', () => {
    const div = __htmlBuilder<never>().div([inertHtml.Type('button')])

    expect(div?.data?.props?.['type']).toBe('button')
    expect(isClientOnlyProperty(div?.data?.props, 'type')).toBe(true)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('does not export a freely-typed html() factory', () => {
    expect(Object.keys(HtmlModule)).not.toContain('html')
  })

  it('keeps the builder factory off the consumer surface', () => {
    const publicKeys = Object.keys(HtmlPublicModule)
    expect(publicKeys).not.toContain('html')
    expect(publicKeys).not.toContain('__htmlBuilder')
    expect(publicKeys).toContain('inertHtml')
  })

  it('builds the same vnode whether children are omitted or passed empty', () => {
    const omitted = inertHtml.div([inertHtml.Class('card')])
    // oxlint-disable-next-line foldkit/no-empty-children-array -- the redundant form is what this compares against
    const explicit = inertHtml.div([inertHtml.Class('card')], [])
    expect(omitted).toEqual(explicit)
  })

  it('hands out one process-wide builder object across Message instantiations', () => {
    const parentBuilder: unknown = __htmlBuilder<ParentMessage>()
    const childBuilder: unknown = __htmlBuilder<ChildMessage>()
    expect(parentBuilder).toBe(childBuilder)
    expect<unknown>(inertHtml).toBe(parentBuilder)
  })

  it('keeps createLazy cache hits when the builder flows through the args array', () => {
    let labelRunCount = 0
    const labelView = (h: HtmlBuilder<ParentMessage>, label: string): Html => {
      labelRunCount += 1
      return h.span([], [label])
    }

    const registry = createBoundaryRegistry()
    const dispatchSync: DispatchSync = () => {}
    const context = runtimeContext(dispatchSync)
    const lazyLabel = createLazy()

    // NOTE: each render fetches the builder anew, the way a view receives
    // its `h` parameter per render. The cache hit below therefore locks the
    // singleton contract: were the runtime to hand out a fresh builder per
    // frame, the `===` args comparison would miss on every render.
    setRuntime(dispatchSync, context, registry)
    let first: Html
    try {
      beginRender(registry)
      first = lazyLabel(labelView, [__htmlBuilder<ParentMessage>(), 'memoized'])
    } finally {
      clearRuntime()
    }

    setRuntime(dispatchSync, context, registry)
    let second: Html
    try {
      beginRender(registry)
      second = lazyLabel(labelView, [
        __htmlBuilder<ParentMessage>(),
        'memoized',
      ])
    } finally {
      clearRuntime()
    }

    expect(labelRunCount).toBe(1)
    expect(second).toBe(first)
  })

  it('supplies the root view its builder in a live runtime and routes clicks to update', async () => {
    const Message = defineMessageUnion({ ClickedIncrement: {} })
    type Message = typeof Message.Type
    const Model = Schema.Struct({ count: Schema.Number })
    type Model = typeof Model.Type

    const container = document.createElement('div')
    container.id = 'builder-guarantee-app'
    document.body.appendChild(container)

    const widget = makeElement({
      Model,
      init: () => ({ model: { count: 0 } }),
      update: (
        model: Model,
        _message: Message,
      ): Update.Return<Model, Message> => ({
        model: modifyFields(model, { count: Number.increment }),
      }),
      view: (model, h) =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedIncrement())], ['increment']),
            h.div([], [`count:${model.count}`]),
          ],
        ),
      container,
    })

    const handle = embed(widget)
    try {
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('count:0')
      })
      document.body.querySelector('button')?.click()
      await vi.waitFor(() => {
        expect(document.body.textContent).toContain('count:1')
      })
    } finally {
      handle.dispose()
    }
  })
})
