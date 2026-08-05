import { Array as Array_, Context, Option } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { serializeHtml } from './experimental/server/serialize.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './html/boundary.js'
import { __htmlBuilder } from './html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './html/runtimeSingleton.js'
import { __hydrateVNode } from './hydrate.js'
import { type VNode, h as snabbdomH } from './snabbdom/index.js'

type Message = Readonly<{ _tag: 'ClickedButton' }>

const ClickedButton = (): Message => ({ _tag: 'ClickedButton' })

const h = __htmlBuilder<Message>()

describe('__hydrateVNode', () => {
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>
  let host: HTMLDivElement

  const buildView = <A>(build: () => A): A => {
    registry = createBoundaryRegistry()
    const dispatchSync: DispatchSync = message => {
      dispatched.push(message)
    }
    setRuntime(dispatchSync, Context.empty(), registry)
    beginRender(registry)
    try {
      return build()
    } finally {
      clearRuntime()
    }
  }

  const mountServerHtml = (markup: string): Element => {
    host.innerHTML = markup
    const root = host.firstElementChild
    if (root === null) {
      throw new Error('server markup did not produce a root element')
    }
    return root
  }

  beforeEach(() => {
    dispatched = []
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    host.remove()
  })

  it('adopts server-rendered elements in place', () => {
    const view = buildView(() =>
      h.div([h.Class('page')], [h.span([h.Id('greeting')], ['hello'])]),
    )
    const root = mountServerHtml(serializeHtml(view))
    const span = root.firstElementChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.div([h.Class('page')], [h.span([h.Id('greeting')], ['hello'])]),
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstElementChild).toBe(span)
    expect(root.className).toBe('page')
    expect(span?.textContent).toBe('hello')
  })

  it('attaches event listeners to adopted elements', () => {
    const view = buildView(() =>
      h.button([h.Id('go'), h.OnClick(ClickedButton())], ['Go']),
    )
    const root = mountServerHtml(serializeHtml(view))

    buildView(() =>
      __hydrateVNode(
        root,
        h.button([h.Id('go'), h.OnClick(ClickedButton())], ['Go']),
      ),
    )

    root.dispatchEvent(new MouseEvent('click'))
    expect(dispatched).toEqual([ClickedButton()])
  })

  it('splits merged text nodes for adjacent text children', () => {
    const view = buildView(() => h.p([], ['count: ', '42']))
    const root = mountServerHtml(serializeHtml(view))
    expect(root.childNodes.length).toBe(1)

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['count: ', '42'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.childNodes.length).toBe(2)
    expect(root.textContent).toBe('count: 42')
  })

  it('rebuilds a mismatching subtree at the nearest parent', () => {
    const root = mountServerHtml(
      '<div class="page"><section><em>stale</em></section></div>',
    )
    const section = root.firstElementChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.div([h.Class('page')], [h.section([], [h.strong([], ['fresh'])])]),
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstElementChild).toBe(section)
    expect(section?.innerHTML).toBe('<strong>fresh</strong>')
  })

  it('removes extra server nodes beyond the vnode children', () => {
    const root = mountServerHtml(
      '<ul><li>one</li><li>two</li><li>stale</li></ul>',
    )

    buildView(() =>
      __hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.textContent).toBe('onetwo')
  })

  it('appends trailing vnode children missing from the server DOM', () => {
    const root = mountServerHtml('<ul><li>one</li></ul>')
    const first = root.firstElementChild

    buildView(() =>
      __hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.firstElementChild).toBe(first)
    expect(root.lastElementChild?.textContent).toBe('two')
  })

  it('fires insert hooks once for adopted elements, children first', () => {
    const view = buildView(() => h.div([], [h.span([h.Id('inner')], ['x'])]))
    const root = mountServerHtml(serializeHtml(view))

    const inserted: Array<string> = []
    const nextVNode = buildView(() =>
      h.div([], [h.span([h.Id('inner')], ['x'])]),
    )
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }
    if (nextVNode === null) {
      throw new Error('expected the hydration view to produce a vnode')
    }
    attachInsertHook(nextVNode, 'parent')
    const maybeChild = Array_.findFirst(
      nextVNode.children ?? [],
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (Option.isSome(maybeChild)) {
      attachInsertHook(maybeChild.value, 'child')
    }

    buildView(() => __hydrateVNode(root, nextVNode))

    expect(inserted).toEqual(['child', 'parent'])
  })

  it('rebuilds a text vnode when the server element carries stray markup', () => {
    const root = mountServerHtml('<p><b>stale</b></p>')

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['fresh'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toBe('fresh')
  })

  it('adopts a text vnode when the server element holds a single text node', () => {
    const root = mountServerHtml('<p>same</p>')
    const textNode = root.firstChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['same'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstChild).toBe(textNode)
  })

  it('re-asserts controlled input values over user edits', () => {
    const view = buildView(() => h.input([h.Type('text'), h.Value('model')]))
    const root = mountServerHtml(serializeHtml(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed before boot'

    buildView(() =>
      __hydrateVNode(root, h.input([h.Type('text'), h.Value('model')])),
    )

    expect(root.value).toBe('model')
  })

  it('re-asserts controlled textarea values over user edits', () => {
    const view = buildView(() => h.textarea([h.Value('model')]))
    const root = mountServerHtml(serializeHtml(view))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }
    root.value = 'typed before boot'

    buildView(() => __hydrateVNode(root, h.textarea([h.Value('model')])))

    expect(root.value).toBe('model')
  })

  it('adopts a controlled select and re-asserts the selected option', () => {
    const selectView = () =>
      h.select(
        [h.Value('us')],
        [
          h.option([h.Value('')], ['Choose']),
          h.option([h.Value('us')], ['United States']),
        ],
      )
    const view = buildView(selectView)
    const root = mountServerHtml(serializeHtml(view))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select root')
    }
    expect(root.value).toBe('us')
    const serverOption = root.querySelector('option[value="us"]')
    root.value = ''

    buildView(() => __hydrateVNode(root, selectView()))

    expect(root.value).toBe('us')
    expect(root.querySelector('option[value="us"]')).toBe(serverOption)
  })

  it('keeps an adopted innerHTML subtree when the markup round-trips unchanged', () => {
    const view = buildView(() => h.div([h.InnerHTML('<em>raw</em>')]))
    const root = mountServerHtml(serializeHtml(view))
    const emphasis = root.querySelector('em')
    expect(emphasis).not.toBeNull()

    buildView(() => __hydrateVNode(root, h.div([h.InnerHTML('<em>raw</em>')])))

    expect(root.querySelector('em')).toBe(emphasis)
    expect(root.textContent).toBe('raw')
  })

  it('adopts comment children and text-shortcut elements', () => {
    const root = mountServerHtml('<div><!--note--><span>after</span></div>')
    const commentNode = root.firstChild

    const patchedVNode = __hydrateVNode(
      root,
      snabbdomH('div', {}, [
        snabbdomH('!', 'note'),
        snabbdomH('span', {}, 'after'),
      ]),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstChild).toBe(commentNode)
    expect(root.textContent).toBe('after')
  })

  it('falls back to a replace boot on a root tag mismatch', () => {
    const root = mountServerHtml('<main><p>stale</p></main>')

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.div([h.Class('fresh')], [h.p([], ['fresh'])])),
    )

    expect(patchedVNode.elm).not.toBe(root)
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('div')
    expect(host.firstElementChild?.textContent).toBe('fresh')
  })

  it('hydrates a null view as a comment replacement', () => {
    const root = mountServerHtml('<div>stale</div>')

    const patchedVNode = buildView(() => __hydrateVNode(root, null))

    expect(patchedVNode.sel).toBe('!')
    expect(host.firstElementChild).toBeNull()
  })
})
