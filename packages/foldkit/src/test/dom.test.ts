import { Context, Effect, Function, Option } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { __htmlBuilder, createLazy, defineView } from '../html/index.js'
import {
  clearRuntime,
  requireDispatch,
  setRuntime,
} from '../html/runtimeSingleton.js'
import { defineMessageUnion } from '../message/index.js'
import * as Mount from '../mount/index.js'
import { __patchVNode } from '../vdom.js'
import { render } from './dom/public.js'

const Message = defineMessageUnion({
  CompletedObserveElement: {},
  ClickedSave: {},
})

const disposers: Array<() => void> = []

const track = <A extends { dispose: () => void }>(rendered: A): A => {
  disposers.push(rendered.dispose)
  return rendered
}

afterEach(() => {
  for (const dispose of disposers.reverse()) {
    dispose()
  }
  disposers.length = 0
})

describe('DOM render', () => {
  it('renders accessible structure and controlled properties into the document', () => {
    const rendered = track(
      render<typeof Message.ClickedSave.Type>(h =>
        h.main(
          [],
          [
            h.label([h.For('email')], ['Email']),
            h.input([h.Id('email'), h.Value('person@example.com')]),
            h.select(
              [h.Value('ca')],
              [
                h.option([h.Value('us')], ['United States']),
                h.option([h.Value('ca')], ['Canada']),
              ],
            ),
            h.button([h.OnClick(Message.ClickedSave())], ['Save']),
          ],
        ),
      ),
    )

    expect(rendered.container.isConnected).toBe(true)
    expect(rendered.container.querySelector('label')?.htmlFor).toBe('email')
    expect(rendered.container.querySelector('input')?.value).toBe(
      'person@example.com',
    )
    expect(rendered.container.querySelector('select')?.value).toBe('ca')
    expect(rendered.container.querySelector('button')?.textContent).toBe('Save')
    rendered.dispose()
    rendered.dispose()
    expect(rendered.container.isConnected).toBe(false)
  })

  it('sets Document title, lang, and dir and restores prior values on dispose', () => {
    const title = document.title
    const lang = document.documentElement.getAttribute('lang')
    const dir = document.documentElement.getAttribute('dir')
    const outer = track(
      render(h => ({
        title: 'Home',
        lang: 'uk',
        dir: 'Ltr',
        body: h.main([]),
      })),
    )
    const rendered = track(
      render(h => ({
        title: 'Settings',
        lang: 'ar',
        dir: 'Rtl',
        body: h.main([], ['Settings']),
      })),
    )

    expect(document.title).toBe('Settings')
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
    rendered.dispose()
    expect(document.title).toBe('Home')
    expect(document.documentElement.lang).toBe('uk')
    expect(document.documentElement.dir).toBe('ltr')
    outer.dispose()
    expect(document.title).toBe(title)
    expect(document.documentElement.getAttribute('lang')).toBe(lang)
    expect(document.documentElement.getAttribute('dir')).toBe(dir)
  })

  it('leaves document metadata untouched for Html and omitted lang and dir', () => {
    document.documentElement.lang = 'uk'
    document.documentElement.dir = 'ltr'
    const title = document.title
    const html = track(render(h => h.main([])))
    expect(document.title).toBe(title)
    expect(document.documentElement.lang).toBe('uk')
    html.dispose()

    const rendered = track(render(h => ({ title: 'Page', body: h.main([]) })))
    expect(document.documentElement.lang).toBe('uk')
    expect(document.documentElement.dir).toBe('ltr')
    rendered.dispose()
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('dir')
  })

  it('renders null Html and Document bodies', () => {
    const empty = track(render(() => null))
    expect(empty.container.children).toHaveLength(0)
    const page = track(render(() => ({ title: 'Empty', body: null })))
    expect(document.title).toBe('Empty')
    expect(page.container.children).toHaveLength(0)
  })

  it('dedupes shared Html across positions and separate renders', () => {
    const h = __htmlBuilder<never>()
    const shared = h.span([], ['Shared'])
    const first = track(render(h => h.div([], [shared, shared])))
    const second = track(render(h => h.div([], [shared, shared])))
    first.dispose()
    expect(second.container.querySelectorAll('span')).toHaveLength(2)
    expect(second.container.textContent).toBe('SharedShared')
  })

  it('isolates a lazy view reused across separate renders', () => {
    const h = __htmlBuilder<never>()
    const lazy = createLazy()
    const label = () => h.span([], ['Settings'])
    const view = () => lazy(label, [])
    const first = track(render(view))
    const second = track(render(view))
    first.dispose()
    expect(second.container.querySelector('span')?.textContent).toBe('Settings')
  })

  it('isolates a cached lazy Html value shared by separate renders', () => {
    const h = __htmlBuilder<never>()
    const lazy = createLazy()
    setRuntime(Function.constVoid, Context.empty())
    const shared = (() => {
      try {
        return lazy(() => h.span([], ['Settings']), [])
      } finally {
        clearRuntime()
      }
    })()
    const first = track(render(() => shared))
    const second = track(render(() => shared))
    first.dispose()
    expect(second.container.querySelector('span')?.textContent).toBe('Settings')
  })

  it('does not install event handlers from shared Html', () => {
    const h = __htmlBuilder<typeof Message.Type>()
    const dispatch = vi.fn()
    setRuntime(dispatch, Context.empty())
    const shared = (() => {
      try {
        return h.button([h.OnClick(Message.ClickedSave())], ['Save'])
      } finally {
        clearRuntime()
      }
    })()
    const rendered = track(render(() => shared))
    rendered.container.querySelector('button')?.click()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('preserves a live Submodel boundary when rendering its cached Html', () => {
    const h = __htmlBuilder<typeof Message.Type>()
    const lazy = createLazy()
    const dispatch = vi.fn()
    const childView = defineView<undefined, typeof Message.ClickedSave.Type>(
      (_model, h) => h.button([h.OnClick(Message.ClickedSave())], ['Save']),
    )
    setRuntime(dispatch, Context.empty())
    const shared = (() => {
      try {
        return lazy(
          () =>
            h.submodel({
              slotId: 'settings',
              model: undefined,
              view: childView,
              toParentMessage: () => Message.CompletedObserveElement(),
            }),
          [],
        )
      } finally {
        clearRuntime()
      }
    })()
    const liveContainer = document.createElement('div')
    const placeholder = liveContainer.appendChild(document.createElement('div'))
    document.body.appendChild(liveContainer)
    const live = __patchVNode(Option.none(), shared, placeholder)
    const liveButton = liveContainer.querySelector('button')
    try {
      const rendered = track(render(() => shared))
      rendered.dispose()
      expect(liveButton?.isConnected).toBe(true)
      liveButton?.click()
      expect(dispatch.mock.calls).toEqual([[Message.CompletedObserveElement()]])
    } finally {
      __patchVNode(Option.some(live), null, placeholder)
      expect(liveButton?.isConnected).toBe(false)
      liveContainer.remove()
    }
  })

  it('does not execute Mounts, including Html built in another render frame', async () => {
    const execute = vi.fn(() =>
      Effect.succeed(Message.CompletedObserveElement()),
    )
    const ObserveElement = Mount.define('ObserveElement', {
      messages: [Message.CompletedObserveElement],
      execute,
    })
    const h = __htmlBuilder<typeof Message.Type>()
    const dispatch = vi.fn()
    setRuntime(dispatch, Context.empty())
    const shared = (() => {
      try {
        return h.div([
          h.OnMount(ObserveElement()),
          h.OnUnmount(Message.ClickedSave()),
        ])
      } finally {
        clearRuntime()
      }
    })()
    const rendered = track(
      render<typeof Message.Type>(h =>
        h.main(
          [],
          [
            shared,
            h.div([
              h.OnMount(ObserveElement()),
              h.OnUnmount(Message.ClickedSave()),
            ]),
          ],
        ),
      ),
    )
    await Effect.runPromise(Effect.yieldNow)
    expect(execute).not.toHaveBeenCalled()
    expect(rendered.container.querySelectorAll('div')).toHaveLength(2)
    rendered.dispose()
    await Effect.runPromise(Effect.yieldNow)
    expect(execute).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('renders Submodel views with lazy children', () => {
    const h = __htmlBuilder<never>()
    const lazy = createLazy()
    const label = () => h.span([], ['Settings'])
    const childView = defineView<undefined, never>(() =>
      h.h1([], [lazy(label, [])]),
    )
    const rendered = track(
      render(h =>
        h.main(
          [],
          [
            h.submodel({
              slotId: 'settings',
              model: undefined,
              view: childView,
              toParentMessage: Function.absurd,
            }),
          ],
        ),
      ),
    )
    expect(rendered.container.querySelector('h1')?.textContent).toBe('Settings')
  })

  it('restores the runtime frame when a view throws', () => {
    const children = globalThis.Array.from(document.body.childNodes)
    const error = new Error('View failed')
    expect(() =>
      render(() => {
        throw error
      }),
    ).toThrow(error)
    expect(globalThis.Array.from(document.body.childNodes)).toEqual(children)
    expect(() => requireDispatch()).toThrow()
    const rendered = track(
      render<typeof Message.Type>(h =>
        h.button([h.OnClick(Message.ClickedSave())], ['Save']),
      ),
    )
    expect(rendered.container.querySelector('button')?.textContent).toBe('Save')
  })
})
