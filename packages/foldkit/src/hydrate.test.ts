import { Array, Context, Option } from 'effect'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { serializeHtml } from './experimental/server/serialize.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './html/boundary.js'
import { Prop, __htmlBuilder, customElement } from './html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './html/runtimeSingleton.js'
import { __elementSignature, __hydrateVNode } from './hydrate.js'
import { defineMessageUnion } from './message/index.js'
import { type VNode, h as snabbdomH, toVNode } from './snabbdom/index.js'
import { patch } from './vdom.js'

const Message = defineMessageUnion({
  ClickedButton: {},
  EnteredFocusRegion: {},
  LeftFocusRegion: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()
const unrestrictedTextarea = customElement<Message>()('textarea')

describe('__hydrateVNode', () => {
  let registry: BoundaryRegistry
  let dispatched: globalThis.Array<unknown>
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

  // The server renders every page the client hydrates with the hydration
  // markers on, so the tests serialize the same way rather than through the
  // marker-free static form.
  const serializeHydratable = (root: VNode | null): string =>
    serializeHtml(root, { emitHydrationMarkers: true })

  // The build a served page came from. Adoption compares it against the
  // client's own before anything moves, so every page a test mounts carries one
  // and every adoption names one; the cases that exercise skew override it.
  const BUILD_ID = 'build-one'

  const mountServerHtml = (markup: string): Element => {
    host.innerHTML = markup
    const root = host.firstElementChild
    if (root === null) {
      throw new Error('server markup did not produce a root element')
    }
    root.setAttribute('data-foldkit-build', BUILD_ID)
    return root
  }

  const hydrateVNode = (
    root: Element,
    nextVNode: VNode | null,
    seen?: Set<object>,
    buildId: string = BUILD_ID,
  ): VNode => __hydrateVNode(root, nextVNode, seen, buildId)

  const requireVNode = (html: VNode | null): VNode => {
    if (html === null) {
      throw new Error('expected a VNode')
    }
    return html
  }

  const elementOf = (vnode: VNode): Element => {
    if (!(vnode.elm instanceof Element)) {
      throw new Error('expected a VNode backed by an Element')
    }
    return vnode.elm
  }

  // NOTE: happy-dom reads the selected attribute into `option.selected` but
  // does not initialize `defaultSelected` or `select.selectedIndex` the way a
  // browser parser does. Complete that parser-derived state before testing
  // hydration. The SSR Playwright suite covers the same path in Chromium.
  const completeParsedSelectState = (select: HTMLSelectElement): void => {
    const options = globalThis.Array.from(select.options)
    const selectedOption = options.find(option =>
      option.hasAttribute('selected'),
    )
    for (const option of options) {
      const isSelected = option === selectedOption
      option.defaultSelected = isSelected
      option.selected = isSelected
    }
    select.selectedIndex = selectedOption?.index ?? -1
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
    const root = mountServerHtml(serializeHydratable(view))
    const span = root.firstElementChild

    const patchedVNode = buildView(() =>
      hydrateVNode(
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
      h.button(
        [
          h.Id('go'),
          h.OnClick(Message.ClickedButton(), {
            defaultAction: 'Prevent',
            propagation: 'Stop',
          }),
        ],
        ['Go'],
      ),
    )
    const root = mountServerHtml(serializeHydratable(view))

    buildView(() =>
      hydrateVNode(
        root,
        h.button(
          [
            h.Id('go'),
            h.OnClick(Message.ClickedButton(), {
              defaultAction: 'Prevent',
              propagation: 'Stop',
            }),
          ],
          ['Go'],
        ),
      ),
    )

    let isBubbleObserved = false
    host.addEventListener('click', () => {
      isBubbleObserved = true
    })
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    root.dispatchEvent(click)

    expect(dispatched).toEqual([Message.ClickedButton()])
    expect(click.defaultPrevented).toBe(true)
    expect(isBubbleObserved).toBe(false)
  })

  it('attaches focus boundary listeners without replaying existing focus', () => {
    const view = () =>
      h.div(
        [
          h.Id('editor'),
          h.OnFocusEnter(Message.EnteredFocusRegion()),
          h.OnFocusLeave(Message.LeftFocusRegion()),
        ],
        [h.input([h.Id('editor-input')])],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const input = root.querySelector('#editor-input')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected the editor input')
    }
    input.focus()
    expect(document.activeElement).toBe(input)

    const hydrated = buildView(() => hydrateVNode(root, view()))

    expect(hydrated.elm).toBe(root)
    expect(root.querySelector('#editor-input')).toBe(input)
    expect(document.activeElement).toBe(input)
    expect(dispatched).toStrictEqual([])

    const outside = document.createElement('button')
    host.appendChild(outside)
    input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    )
    input.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: outside }),
    )

    expect(dispatched).toStrictEqual([
      Message.LeftFocusRegion(),
      Message.EnteredFocusRegion(),
    ])
  })

  it('hydrates a table with an explicit tbody and an interactive cell', () => {
    const view = () =>
      h.table(
        [],
        [
          h.tbody(
            [],
            [
              h.tr(
                [],
                [
                  h.td(
                    [],
                    [h.button([h.OnClick(Message.ClickedButton())], ['Go'])],
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const button = root.querySelector('button')

    buildView(() => hydrateVNode(root, view()))

    expect(root.querySelector('button')).toBe(button)
    button?.dispatchEvent(new MouseEvent('click'))
    expect(dispatched).toEqual([Message.ClickedButton()])
  })

  it('splits merged text nodes for adjacent text children', () => {
    const view = buildView(() => h.p([], ['count: ', '42']))
    const root = mountServerHtml(serializeHydratable(view))
    expect(root.childNodes.length).toBe(1)

    const patchedVNode = buildView(() =>
      hydrateVNode(root, h.p([], ['count: ', '42'])),
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
      hydrateVNode(
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
      hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.textContent).toBe('onetwo')
  })

  it('appends trailing vnode children missing from the server DOM', () => {
    const root = mountServerHtml('<ul><li>one</li></ul>')
    const first = root.firstElementChild

    buildView(() =>
      hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.firstElementChild).toBe(first)
    expect(root.lastElementChild?.textContent).toBe('two')
  })

  it('rebuilds keyed rows instead of transferring state to the wrong entity', () => {
    // Server rendered rows A then B; the client's first view is B then A (stale
    // or reordered HTML). Positional adoption would hand client row B the server
    // node still holding A's typed value. The key markers must force a rebuild.
    const serverView = () =>
      h.div(
        [],
        [
          h.keyed('input')('A', [h.Type('text'), h.DataAttribute('row', 'A')]),
          h.keyed('input')('B', [h.Type('text'), h.DataAttribute('row', 'B')]),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(serverView)))
    const [serverNodeA, serverNodeB] = globalThis.Array.from(
      root.querySelectorAll('input'),
    )
    if (
      !(serverNodeA instanceof HTMLInputElement) ||
      !(serverNodeB instanceof HTMLInputElement)
    ) {
      throw new Error('expected two server input rows')
    }
    serverNodeA.value = 'typed-into-A'
    serverNodeB.value = 'typed-into-B'

    const clientView = () =>
      h.div(
        [],
        [
          h.keyed('input')('B', [h.Type('text'), h.DataAttribute('row', 'B')]),
          h.keyed('input')('A', [h.Type('text'), h.DataAttribute('row', 'A')]),
        ],
      )
    buildView(() => hydrateVNode(root, clientView()))

    const firstInput = root.querySelector('input')
    expect(firstInput?.getAttribute('data-row')).toBe('B')
    expect(firstInput).not.toBe(serverNodeA)
    if (firstInput instanceof HTMLInputElement) {
      expect(firstInput.value).not.toBe('typed-into-A')
    }
    expect(root.querySelector('[data-foldkit-key]')).toBeNull()
  })

  it('rebuilds a row keyed by a number when the client keys it by the same digits as a string', () => {
    // The runtime compares keys with `===`, so the number 1 and the string '1'
    // are different entities. A marker that collapsed the two would hand the
    // string-keyed client row the number-keyed server node, and the value typed
    // into it.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.div([], [h.keyed('input')(1, [h.Type('text')])])),
      ),
    )
    const serverInput = root.querySelector('input')
    if (!(serverInput instanceof HTMLInputElement)) {
      throw new Error('expected a server input row')
    }
    serverInput.value = 'typed-into-1'

    buildView(() =>
      hydrateVNode(root, h.div([], [h.keyed('input')('1', [h.Type('text')])])),
    )

    const hydratedInput = root.querySelector('input')
    expect(hydratedInput).not.toBe(serverInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.value).not.toBe('typed-into-1')
    }
  })

  it('refuses a page from another build before it can move any DOM state', () => {
    // Reproduction A: the view module is byte-identical across the two builds
    // and only a constant it imports changed, so every view identity matches
    // and no per-element comparison can see the difference. The build token is
    // what separates the two deployments.
    const serverRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('email')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    const identity = 'src/page/account.ts#field@1111aaaa2222'
    const [serverField] = (serverRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (serverField === undefined) {
      throw new Error('expected a server field')
    }
    serverField.identity = identity

    const root = mountServerHtml(serializeHydratable(serverRoot))
    // The served page came from a build that stamped its own token.
    root.setAttribute('data-foldkit-build', 'build-one')
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const clientRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    const [clientField] = (clientRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (clientField === undefined) {
      throw new Error('expected a client field')
    }
    // The same identity on both sides: only the imported constant changed.
    clientField.identity = identity

    const patchedVNode = buildView(() =>
      hydrateVNode(root, clientRoot, undefined, 'build-two'),
    )

    expect(patchedVNode.elm).not.toBe(root)
    const hydratedInput =
      patchedVNode.elm instanceof Element
        ? patchedVNode.elm.querySelector('input')
        : null
    expect(hydratedInput).not.toBe(servedInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.getAttribute('name')).toBe('ssn')
      expect(hydratedInput.value).not.toBe('alice@example.com')
    }
  })

  it('refuses a page whose build id is absent from a client that has one', () => {
    // Reproduction B: the parent's call changed while the component it calls
    // did not, so the winning identity is the component's and matches on both
    // sides. A page built without the plugin meeting a client built with it is
    // the same disagreement seen from the other direction.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() =>
          h.form([], [h.input([h.Type('text'), h.Name('email')])]),
        ),
      ),
    )
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const patchedVNode = buildView(() =>
      hydrateVNode(
        root,
        h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
        undefined,
        'build-two',
      ),
    )

    expect(patchedVNode.elm).not.toBe(root)
  })

  it('rebuilds a detached root rather than reusing it', () => {
    // A caller can resolve the stamped root itself and hand over an element
    // that is not in the document. Patching that root directly would let
    // snabbdom match it by tag and keep it, so a page from another deployment
    // would survive the very check that rejected it, carrying its DOM state
    // with it.
    const root = document.createElement('form')
    root.setAttribute('data-foldkit-build', 'build-one')
    const servedInput = document.createElement('input')
    servedInput.setAttribute('type', 'text')
    servedInput.setAttribute('name', 'email')
    servedInput.value = 'alice@example.com'
    root.appendChild(servedInput)

    const patchedVNode = buildView(() =>
      hydrateVNode(
        root,
        h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
        undefined,
        'build-two',
      ),
    )

    expect(patchedVNode.elm).not.toBe(root)
    const hydratedInput =
      patchedVNode.elm instanceof Element
        ? patchedVNode.elm.querySelector('input')
        : null
    expect(hydratedInput).not.toBe(servedInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.getAttribute('name')).toBe('ssn')
      expect(hydratedInput.value).toBe('')
    }
  })

  it('runs the insert hook of a root rebuilt from a detached one', () => {
    // The replacement is a node the differ created, so its Mount runs. Reusing
    // the detached root would skip it, leaving a rebuilt root uninitialized.
    const inserted: globalThis.Array<string> = []
    const root = document.createElement('div')
    root.setAttribute('data-foldkit-build', 'build-one')

    const clientRoot = buildView(() => h.div([], ['fresh']))
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    clientRoot.data = {
      ...clientRoot.data,
      hook: { insert: () => inserted.push('root') },
    }

    const patchedVNode = buildView(() =>
      hydrateVNode(root, clientRoot, undefined, 'build-two'),
    )

    expect(patchedVNode.elm).not.toBe(root)
    expect(inserted).toEqual(['root'])
  })

  it('adopts a page whose build id matches the client', () => {
    // The counterpart: corresponding artifacts still adopt, so the id costs a
    // matching deployment nothing.
    const root = mountServerHtml(
      serializeHydratable(buildView(() => h.main([], [h.span([], ['hi'])]))),
    )
    root.setAttribute('data-foldkit-build', 'build-one')
    const servedSpan = root.querySelector('span')

    const patchedVNode = buildView(() =>
      hydrateVNode(
        root,
        h.main([], [h.span([], ['hi'])]),
        undefined,
        'build-one',
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('span')).toBe(servedSpan)
    expect(root.getAttribute('data-foldkit-build')).toBeNull()
  })

  it('rebuilds a stale field rather than carrying its value into a changed view', () => {
    // Build skew: the served page came from a build whose view rendered an
    // email field, and the client bundle renders a social security number from
    // the same source position. The build stamps a digest of the view module
    // into its identity, so the two identities differ and the served input is
    // rebuilt. Adopting it would move what the visitor typed into a field that
    // means something else and submits under a different name.
    const serverRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('email')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    const [serverField] = (serverRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (serverField === undefined) {
      throw new Error('expected a server field')
    }
    serverField.identity = 'src/page/account.ts#field@1111aaaa2222'

    const root = mountServerHtml(serializeHydratable(serverRoot))
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const clientRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    const [clientField] = (clientRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (clientField === undefined) {
      throw new Error('expected a client field')
    }
    clientField.identity = 'src/page/account.ts#field@3333bbbb4444'

    buildView(() => hydrateVNode(root, clientRoot))

    const hydratedInput = root.querySelector('input')
    expect(hydratedInput?.getAttribute('name')).toBe('ssn')
    expect(hydratedInput).not.toBe(servedInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.value).not.toBe('alice@example.com')
    }
  })

  it('rebuilds a root whose key disagrees with the served one', () => {
    // The root is a logical entity like any other node. A served root keyed A
    // and a client root keyed B are different entities, so adopting would carry
    // A's typed state into a root the client never rendered there.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.keyed('input')('A', [h.Type('text')])),
      ),
    )
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed-into-A'

    const patchedVNode = buildView(() =>
      hydrateVNode(root, h.keyed('input')('B', [h.Type('text')])),
    )

    const hydratedRoot = patchedVNode.elm
    expect(hydratedRoot).not.toBe(root)
    if (hydratedRoot instanceof HTMLInputElement) {
      expect(hydratedRoot.value).not.toBe('typed-into-A')
      expect(hydratedRoot.getAttribute('data-foldkit-key')).toBeNull()
    }
  })

  it('rebuilds a root whose view identity disagrees with the served one', () => {
    // Two branches of a route can render the same tag from different view
    // functions. The compiler identity is what tells them apart, so a served
    // root from one branch is never adopted by the other.
    const serverRoot = buildView(() => h.form([], [h.input([h.Type('text')])]))
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    serverRoot.identity = 'src/page/sign-in.ts:SignInView'
    const root = mountServerHtml(serializeHydratable(serverRoot))
    const serverInput = root.querySelector('input')
    if (!(serverInput instanceof HTMLInputElement)) {
      throw new Error('expected a server input')
    }
    serverInput.value = 'typed-into-sign-in'

    const clientRoot = buildView(() => h.form([], [h.input([h.Type('text')])]))
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    clientRoot.identity = 'src/page/sign-up.ts:SignUpView'
    const patchedVNode = buildView(() => hydrateVNode(root, clientRoot))

    const hydratedRoot = patchedVNode.elm
    expect(hydratedRoot).not.toBe(root)
    if (hydratedRoot instanceof Element) {
      const hydratedInput = hydratedRoot.querySelector('input')
      expect(hydratedInput).not.toBe(serverInput)
      if (hydratedInput instanceof HTMLInputElement) {
        expect(hydratedInput.value).not.toBe('typed-into-sign-in')
      }
      expect(hydratedRoot.getAttribute('data-foldkit-identity')).toBeNull()
    }
  })

  it('adopts a root whose key and view identity agree with the served one', () => {
    // The counterpart: an agreeing root is adopted in place, so the identity
    // check costs a matching render nothing.
    const serverRoot = buildView(() =>
      h.keyed('form')('sign-in', [], [h.input([h.Type('text')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    serverRoot.identity = 'src/page/sign-in.ts:SignInView'
    const root = mountServerHtml(serializeHydratable(serverRoot))
    const serverInput = root.querySelector('input')

    const clientRoot = buildView(() =>
      h.keyed('form')('sign-in', [], [h.input([h.Type('text')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    clientRoot.identity = 'src/page/sign-in.ts:SignInView'
    const patchedVNode = buildView(() => hydrateVNode(root, clientRoot))

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('input')).toBe(serverInput)
    expect(root.getAttribute('data-foldkit-key')).toBeNull()
    expect(root.getAttribute('data-foldkit-identity')).toBeNull()
  })

  it('rebuilds a keyed root when the served markup carries no hydration markers', () => {
    // Markup rendered as static output carries no marker channel at all, so a
    // client that hydrates it cannot confirm the root is the same entity. The
    // safe reading of a missing marker is disagreement.
    const root = mountServerHtml(
      serializeHtml(buildView(() => h.keyed('input')('A', [h.Type('text')]))),
    )
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed-into-A'

    const patchedVNode = buildView(() =>
      hydrateVNode(root, h.keyed('input')('A', [h.Type('text')])),
    )

    expect(patchedVNode.elm).not.toBe(root)
  })

  it('fires insert hooks once for adopted elements, children first', () => {
    const view = buildView(() => h.div([], [h.span([h.Id('inner')], ['x'])]))
    const root = mountServerHtml(serializeHydratable(view))

    const inserted: globalThis.Array<string> = []
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
    const maybeChild = Array.findFirst(
      nextVNode.children ?? [],
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (Option.isSome(maybeChild)) {
      attachInsertHook(maybeChild.value, 'child')
    }

    buildView(() => hydrateVNode(root, nextVNode))

    expect(inserted).toEqual(['child', 'parent'])
  })

  it('fires insert hooks children-first across adopted and created siblings', () => {
    // The server rendered one child; the client's first view has two. The
    // differ queues a hook when it creates a node and flushes at the end of the
    // patch, so firing created hooks from that queue and adopted hooks
    // afterward would run the created sibling's Mount before the adopted one's,
    // the reverse of a fresh render. A Mount that depends on a sibling being
    // initialized would work on a fresh boot and break on a hydrated one.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.main([], [h.span([h.Id('first')], ['a'])])),
      ),
    )

    const inserted: globalThis.Array<string> = []
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }

    const buildTree = (): VNode => {
      const tree = buildView(() =>
        h.main(
          [],
          [h.span([h.Id('first')], ['a']), h.div([h.Id('second')], ['b'])],
        ),
      )
      if (tree === null) {
        throw new Error('expected the view to produce a vnode')
      }
      const [first, second] = (tree.children ?? []).filter(
        (candidate): candidate is VNode => typeof candidate !== 'string',
      )
      attachInsertHook(tree, 'root')
      if (first !== undefined) {
        attachInsertHook(first, 'first')
      }
      if (second !== undefined) {
        attachInsertHook(second, 'second')
      }
      return tree
    }

    buildView(() => hydrateVNode(root, buildTree()))

    expect(inserted).toEqual(['first', 'second', 'root'])
  })

  it('fires insert hooks in the same order as a fresh render', () => {
    // The same tree rendered from nothing is the reference order, so hydration
    // is compared against it rather than against a hand-written expectation.
    const inserted: globalThis.Array<string> = []
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }
    const buildTree = (): VNode => {
      const tree = buildView(() =>
        h.main(
          [],
          [
            h.span([h.Id('first')], ['a']),
            h.div([h.Id('second')], [h.em([h.Id('nested')], ['c'])]),
          ],
        ),
      )
      if (tree === null) {
        throw new Error('expected the view to produce a vnode')
      }
      attachInsertHook(tree, 'root')
      const [first, second] = (tree.children ?? []).filter(
        (candidate): candidate is VNode => typeof candidate !== 'string',
      )
      if (first !== undefined) {
        attachInsertHook(first, 'first')
      }
      if (second !== undefined) {
        attachInsertHook(second, 'second')
        const [nested] = (second.children ?? []).filter(
          (candidate): candidate is VNode => typeof candidate !== 'string',
        )
        if (nested !== undefined) {
          attachInsertHook(nested, 'nested')
        }
      }
      return tree
    }

    const freshHost = document.createElement('div')
    document.body.appendChild(freshHost)
    buildView(() => patch(toVNode(freshHost), buildTree()))
    const freshOrder = [...inserted]
    freshHost.remove()

    inserted.length = 0
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.main([], [h.span([h.Id('first')], ['a'])])),
      ),
    )
    buildView(() => hydrateVNode(root, buildTree()))

    expect(inserted).toEqual(freshOrder)
  })

  it('rebuilds a text vnode when the server element carries stray markup', () => {
    const root = mountServerHtml('<p><b>stale</b></p>')

    const patchedVNode = buildView(() => hydrateVNode(root, h.p([], ['fresh'])))

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toBe('fresh')
  })

  it('adopts a text vnode when the server element holds a single text node', () => {
    const root = mountServerHtml('<p>same</p>')
    const textNode = root.firstChild

    const patchedVNode = buildView(() => hydrateVNode(root, h.p([], ['same'])))

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstChild).toBe(textNode)
  })

  it('clears stale server children under a childless vnode', () => {
    const root = mountServerHtml('<div id="slot"><span>stale</span></div>')
    expect(root.querySelector('span')).not.toBeNull()

    buildView(() => hydrateVNode(root, h.div([h.Id('slot')])))

    expect(root.querySelector('span')).toBeNull()
    expect(root.childNodes.length).toBe(0)
  })

  it('re-asserts controlled input values over user edits', () => {
    const view = buildView(() => h.input([h.Type('text'), h.Value('model')]))
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed before boot'

    buildView(() =>
      hydrateVNode(root, h.input([h.Type('text'), h.Value('model')])),
    )

    expect(root.value).toBe('model')
  })

  it('re-asserts controlled textarea values over user edits', () => {
    const view = buildView(() => h.textarea([h.Value('model')]))
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }
    root.value = 'typed before boot'

    buildView(() => hydrateVNode(root, h.textarea([h.Value('model')])))

    expect(root.value).toBe('model')
  })

  it('does not rewrite an agreeing reflected property during hydration', () => {
    const view = () =>
      h.a([h.Href('/adopted-link'), h.Title('adopted link')], ['Link'])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const observer = new MutationObserver(() => {})
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['href', 'title'],
    })

    const hydrated = buildView(() => hydrateVNode(root, view()))

    expect(hydrated.elm).toBe(root)
    expect(observer.takeRecords()).toEqual([])
    observer.disconnect()
  })

  it('repairs a stale reflected property through its typed owner', () => {
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.a([h.Href('/old-link')], ['Link'])),
      ),
    )
    const observer = new MutationObserver(() => {})
    observer.observe(root, { attributes: true, attributeFilter: ['href'] })

    buildView(() => hydrateVNode(root, h.a([h.Href('/new-link')], ['Link'])))

    expect(root.getAttribute('href')).toBe('/new-link')
    expect(observer.takeRecords()).toHaveLength(1)
    observer.disconnect()
  })

  it('does not create probe documents for reflected properties', () => {
    const view = () =>
      h.main(
        [h.Id('page'), h.Title('Page')],
        [
          h.section(
            [h.Id('section')],
            [h.a([h.Href('/account'), h.Tabindex(2)], ['Account'])],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const createDocument = vi.spyOn(
      document.implementation,
      'createHTMLDocument',
    )

    try {
      buildView(() => hydrateVNode(root, view()))
      expect(createDocument).not.toHaveBeenCalled()
    } finally {
      createDocument.mockRestore()
    }
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
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select root')
    }
    expect(root.value).toBe('us')
    const serverOption = root.querySelector('option[value="us"]')
    root.value = ''

    buildView(() => hydrateVNode(root, selectView()))

    expect(root.value).toBe('us')
    expect(root.querySelector('option[value="us"]')).toBe(serverOption)
  })

  it('adopts effective controlled selection without reporting a mismatch', () => {
    const view = () =>
      h.div(
        [],
        [
          h.select(
            [h.Value('a')],
            [
              h.option([h.Value('a')], ['A']),
              h.option([h.Value('b'), h.Selected(true)], ['B']),
            ],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const select = root.querySelector('select')
    const firstOption = root.querySelector('option[value="a"]')
    const secondOption = root.querySelector('option[value="b"]')
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    if (!(firstOption instanceof HTMLOptionElement)) {
      throw new Error('expected the first option')
    }
    if (!(secondOption instanceof HTMLOptionElement)) {
      throw new Error('expected the second option')
    }
    completeParsedSelectState(select)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      const hydrated = buildView(() => hydrateVNode(root, view()))

      expect(hydrated.elm).toBe(root)
      expect(root.querySelector('select')).toBe(select)
      expect(root.querySelector('option[value="a"]')).toBe(firstOption)
      expect(root.querySelector('option[value="b"]')).toBe(secondOption)
      expect({
        firstDefaultSelected: firstOption.defaultSelected,
        firstHasSelected: firstOption.hasAttribute('selected'),
        firstSelected: firstOption.selected,
        secondDefaultSelected: secondOption.defaultSelected,
        secondHasSelected: secondOption.hasAttribute('selected'),
        secondSelected: secondOption.selected,
        selectedIndex: select.selectedIndex,
        value: select.value,
      }).toEqual({
        firstDefaultSelected: true,
        firstHasSelected: true,
        firstSelected: true,
        secondDefaultSelected: false,
        secondHasSelected: false,
        secondSelected: false,
        selectedIndex: 0,
        value: 'a',
      })
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('adopts controlled selection through an optgroup', () => {
    const view = () =>
      h.div(
        [],
        [
          h.select(
            [h.Value('a')],
            [
              h.optgroup(
                [],
                [
                  h.option(
                    [h.Id('first-a'), h.Value('a'), h.Selected(false)],
                    ['First'],
                  ),
                  h.option(
                    [h.Id('second-b'), h.Value('b'), h.Selected(true)],
                    ['Second'],
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const select = root.querySelector('select')
    const firstOption = root.querySelector('#first-a')
    const secondOption = root.querySelector('#second-b')
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    if (!(firstOption instanceof HTMLOptionElement)) {
      throw new Error('expected the first option')
    }
    if (!(secondOption instanceof HTMLOptionElement)) {
      throw new Error('expected the second option')
    }
    completeParsedSelectState(select)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      buildView(() => hydrateVNode(root, view()))

      expect(root.querySelector('#first-a')).toBe(firstOption)
      expect(root.querySelector('#second-b')).toBe(secondOption)
      expect({
        firstDefaultSelected: firstOption.defaultSelected,
        firstSelected: firstOption.selected,
        secondDefaultSelected: secondOption.defaultSelected,
        secondSelected: secondOption.selected,
        selectedIndex: select.selectedIndex,
        value: select.value,
      }).toEqual({
        firstDefaultSelected: true,
        firstSelected: true,
        secondDefaultSelected: false,
        secondSelected: false,
        selectedIndex: 0,
        value: 'a',
      })
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('adopts an allowed controlled value that matches no option', () => {
    const view = () =>
      h.select(
        [h.Value('missing'), h.Multiple(true)],
        [h.option([h.Value('a')], ['A'])],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    completeParsedSelectState(root)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      buildView(() => hydrateVNode(root, view()))

      expect(root.value).toBe('')
      expect(root.selectedIndex).toBe(-1)
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('reports extra selected state beneath a controlled select', () => {
    const view = () =>
      h.div(
        [],
        [
          h.select(
            [h.Value('a'), h.Multiple(true)],
            [
              h.option([h.Value('a')], ['A']),
              h.option([h.Value('b'), h.Selected(false)], ['B']),
            ],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const select = root.querySelector('select')
    const firstOption = root.querySelector('option[value="a"]')
    const secondOption = root.querySelector('option[value="b"]')
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    if (!(secondOption instanceof HTMLOptionElement)) {
      throw new Error('expected the second option')
    }
    if (!(firstOption instanceof HTMLOptionElement)) {
      throw new Error('expected the first option')
    }
    completeParsedSelectState(select)
    secondOption.selected = true
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      buildView(() => hydrateVNode(root, view()))

      expect(select.value).toBe('a')
      expect(select.selectedIndex).toBe(0)
      expect(secondOption.selected).toBe(false)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'The server DOM did not match the first client view during hydration',
        ),
      )
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('reports stale default selection beneath a controlled select', () => {
    const view = () =>
      h.div(
        [],
        [
          h.select(
            [h.Value('a')],
            [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const select = root.querySelector('select')
    const secondOption = root.querySelector('option[value="b"]')
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    if (!(secondOption instanceof HTMLOptionElement)) {
      throw new Error('expected the second option')
    }
    completeParsedSelectState(select)
    secondOption.defaultSelected = true
    secondOption.selected = false
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      buildView(() => hydrateVNode(root, view()))

      expect(secondOption.defaultSelected).toBe(false)
      expect(secondOption.selected).toBe(false)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('still reports selected state owned by an uncontrolled select', () => {
    const view = () =>
      h.div(
        [],
        [
          h.select(
            [h.Multiple(true)],
            [h.option([h.Value('a'), h.Selected(false)], ['A'])],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const select = root.querySelector('select')
    const option = root.querySelector('option')
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }
    if (!(option instanceof HTMLOptionElement)) {
      throw new Error('expected an option')
    }
    completeParsedSelectState(select)
    option.selected = true
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      buildView(() => hydrateVNode(root, view()))

      expect(option.selected).toBe(false)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('keeps an adopted innerHTML subtree when the markup round-trips unchanged', () => {
    const view = buildView(() => h.div([h.InnerHTML('<em>raw</em>')]))
    const root = mountServerHtml(serializeHydratable(view))
    const emphasis = root.querySelector('em')
    expect(emphasis).not.toBeNull()

    buildView(() => hydrateVNode(root, h.div([h.InnerHTML('<em>raw</em>')])))

    expect(root.querySelector('em')).toBe(emphasis)
    expect(root.textContent).toBe('raw')
  })

  it('adopts an innerHTML subtree the parser normalized away from the authored markup', () => {
    const authoredMarkup = '<em>say &quot;hi&quot;</em>'
    const view = buildView(() => h.div([h.InnerHTML(authoredMarkup)]))
    const root = mountServerHtml(serializeHydratable(view))
    const emphasis = root.querySelector('em')
    expect(emphasis).not.toBeNull()
    expect(root.innerHTML).not.toBe(authoredMarkup)

    buildView(() => hydrateVNode(root, h.div([h.InnerHTML(authoredMarkup)])))

    expect(root.querySelector('em')).toBe(emphasis)
    expect(root.textContent).toBe('say "hi"')
  })

  it('adopts an SVG innerHTML subtree whose markup uses camelCase attributes', () => {
    const authoredMarkup = '<path pathLength="100" d="M0 0L10 10"></path>'
    const svgView = () => h.svg([h.InnerHTML(authoredMarkup)])
    const view = buildView(svgView)
    const root = mountServerHtml(serializeHydratable(view))
    const serverPath = root.querySelector('path')
    expect(serverPath).not.toBeNull()

    buildView(() => hydrateVNode(root, svgView()))

    expect(root.querySelector('path')).toBe(serverPath)
  })

  it('does not adopt an SVG element whose tag casing differs', () => {
    const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
    svg.setAttribute('data-foldkit-build', BUILD_ID)
    const uppercaseRect = document.createElementNS(SVG_NAMESPACE, 'RECT')
    svg.appendChild(uppercaseRect)
    host.appendChild(svg)

    buildView(() => hydrateVNode(svg, h.svg([], [h.rect([])])))

    expect(svg.firstElementChild).not.toBe(uppercaseRect)
    expect(svg.firstElementChild?.localName).toBe('rect')
    expect(svg.firstElementChild?.namespaceURI).toBe(SVG_NAMESPACE)
  })

  it('adopts a MathML subtree by namespace', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    math.setAttribute('data-foldkit-build', BUILD_ID)
    const mi = document.createElementNS(MATHML_NAMESPACE, 'mi')
    mi.textContent = 'x'
    math.appendChild(mi)
    host.appendChild(math)

    buildView(() => hydrateVNode(math, h.math([], [h.mi([], ['x'])])))

    const adoptedMi = math.querySelector('mi')
    expect(adoptedMi).toBe(mi)
    expect(math.namespaceURI).toBe(MATHML_NAMESPACE)
    expect(adoptedMi?.namespaceURI).toBe(MATHML_NAMESPACE)
  })

  it('does not adopt a MathML element whose tag casing differs', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const uppercaseMath = document.createElementNS(MATHML_NAMESPACE, 'MATH')
    uppercaseMath.setAttribute('data-foldkit-build', BUILD_ID)
    host.appendChild(uppercaseMath)

    const hydrated = buildView(() => hydrateVNode(uppercaseMath, h.math([])))
    const hydratedMath = elementOf(hydrated)

    expect(hydratedMath).not.toBe(uppercaseMath)
    expect(uppercaseMath.isConnected).toBe(false)
    expect(hydratedMath.localName).toBe('math')
    expect(hydratedMath.namespaceURI).toBe(MATHML_NAMESPACE)
  })

  it('adopts an mglyph child inside a MathML text integration point', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    math.setAttribute('data-foldkit-build', BUILD_ID)
    const mi = document.createElementNS(MATHML_NAMESPACE, 'mi')
    const mglyph = document.createElementNS(MATHML_NAMESPACE, 'mglyph')
    mi.appendChild(mglyph)
    math.appendChild(mi)
    host.appendChild(math)

    buildView(() => hydrateVNode(math, h.math([], [h.mi([], [h.mglyph([])])])))

    const adoptedMglyph = math.querySelector('mglyph')
    expect(adoptedMglyph).toBe(mglyph)
    expect(adoptedMglyph?.namespaceURI).toBe(MATHML_NAMESPACE)
  })

  it('adopts an HTML child inside annotation-xml with an HTML encoding', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    math.setAttribute('data-foldkit-build', BUILD_ID)
    const annotationXml = document.createElementNS(
      MATHML_NAMESPACE,
      'annotation-xml',
    )
    annotationXml.setAttribute('encoding', 'text/html')
    const div = document.createElement('div')
    div.textContent = 'x'
    annotationXml.appendChild(div)
    math.appendChild(annotationXml)
    host.appendChild(math)

    buildView(() =>
      hydrateVNode(
        math,
        h.math(
          [],
          [
            h['annotation-xml'](
              [h.Attribute('encoding', 'text/html')],
              [h.div([], ['x'])],
            ),
          ],
        ),
      ),
    )

    expect(math.querySelector('annotation-xml')).toBe(annotationXml)
    const adoptedDiv = math.querySelector('div')
    expect(adoptedDiv).toBe(div)
    expect(adoptedDiv?.namespaceURI).toBe(HTML_NAMESPACE)
  })

  it('preserves state a custom element added before hydration', () => {
    class XOwned extends HTMLElement {
      connectedCallback(): void {
        this.setAttribute('role', 'button')
        this.setAttribute('data-ready', 'yes')
        const span = this.ownerDocument.createElement('span')
        span.textContent = 'owned'
        this.appendChild(span)
      }
    }
    if (customElements.get('x-owned') === undefined) {
      customElements.define('x-owned', XOwned)
    }

    // The element upgrades and runs connectedCallback when it connects, before
    // hydration adopts it.
    const element = document.createElement('x-owned')
    element.setAttribute('data-foldkit-build', BUILD_ID)
    host.appendChild(element)
    expect(element.getAttribute('role')).toBe('button')
    expect(element.querySelector('span')?.textContent).toBe('owned')

    const hydrated = buildView(() =>
      hydrateVNode(element, snabbdomH('x-owned', [])),
    )

    expect(hydrated.elm).toBe(element)
    expect(element.getAttribute('role')).toBe('button')
    expect(element.getAttribute('data-ready')).toBe('yes')
    expect(element.querySelector('span')?.textContent).toBe('owned')
  })

  it('keeps custom element classes and styles the view does not declare', () => {
    class XStyled extends HTMLElement {
      connectedCallback(): void {
        this.classList.add('owned')
        this.style.backgroundColor = 'red'
      }
    }
    if (customElements.get('x-styled') === undefined) {
      customElements.define('x-styled', XStyled)
    }

    // NOTE: the server DOM carries the view's declared class and style; the
    // component adds its own on upgrade, before hydration adopts the element.
    const element = document.createElement('x-styled')
    element.setAttribute('class', 'client')
    element.setAttribute('style', 'color: blue')
    element.setAttribute('data-foldkit-build', BUILD_ID)
    host.appendChild(element)
    expect(element.classList.contains('owned')).toBe(true)
    expect(element.style.getPropertyValue('background-color')).toBe('red')

    const hydrated = buildView(() =>
      hydrateVNode(
        element,
        snabbdomH('x-styled', {
          class: { client: true },
          style: { color: 'blue' },
        }),
      ),
    )

    expect(hydrated.elm).toBe(element)
    expect(element.classList.contains('client')).toBe(true)
    expect(element.classList.contains('owned')).toBe(true)
    expect(element.style.getPropertyValue('color')).toBe('blue')
    expect(element.style.getPropertyValue('background-color')).toBe('red')
  })

  it('does not attach a childless custom element listener twice', () => {
    class XHydratedListener extends HTMLElement {}
    if (customElements.get('x-hydrated-listener') === undefined) {
      customElements.define('x-hydrated-listener', XHydratedListener)
    }
    const element = document.createElement('x-hydrated-listener')
    element.setAttribute('data-foldkit-build', BUILD_ID)
    host.appendChild(element)
    let clicks = 0
    const view = snabbdomH('x-hydrated-listener', {
      on: {
        click: () => {
          clicks += 1
        },
      },
    })

    const hydrated = buildView(() => hydrateVNode(element, view))
    element.click()

    expect(hydrated.elm).toBe(element)
    expect(clicks).toBe(1)
  })

  it('does not re-notify an upgraded custom element for an unchanged typed attribute', () => {
    const observations: globalThis.Array<
      readonly [string | null, string | null]
    > = []
    class XObservedId extends HTMLElement {
      static get observedAttributes(): ReadonlyArray<string> {
        return ['id']
      }

      attributeChangedCallback(
        _name: string,
        oldValue: string | null,
        newValue: string | null,
      ): void {
        observations.push([oldValue, newValue])
      }
    }
    if (customElements.get('x-observed-id') === undefined) {
      customElements.define('x-observed-id', XObservedId)
    }
    const element = document.createElement('x-observed-id')
    element.id = 'same'
    element.setAttribute('data-foldkit-app', 'app')
    element.setAttribute('data-foldkit-build', BUILD_ID)
    host.appendChild(element)
    const view = () => customElement<Message>()('x-observed-id')([h.Id('same')])

    const hydrated = buildView(() => hydrateVNode(element, view()))

    expect(hydrated.elm).toBe(element)
    expect(observations).toEqual([[null, 'same']])
  })

  it('does not re-notify a custom element for an agreeing normalized global attribute', () => {
    const observations: globalThis.Array<
      readonly [string | null, string | null]
    > = []
    class XObservedDirection extends HTMLElement {
      static get observedAttributes(): ReadonlyArray<string> {
        return ['dir']
      }

      attributeChangedCallback(
        _name: string,
        oldValue: string | null,
        newValue: string | null,
      ): void {
        observations.push([oldValue, newValue])
      }
    }
    customElements.define('x-observed-direction', XObservedDirection)
    const view = () =>
      customElement<Message>()('x-observed-direction')([h.Dir('LTR')])
    const element = mountServerHtml(serializeHydratable(buildView(view)))

    const hydrated = buildView(() => hydrateVNode(element, view()))

    expect(hydrated.elm).toBe(element)
    expect(element.getAttribute('dir')).toBe('LTR')
    expect(observations).toEqual([[null, 'LTR']])
  })

  it('adopts both draggable states on a custom element without rewriting them', () => {
    const observations: globalThis.Array<
      readonly [string | null, string | null]
    > = []
    class XObservedDraggable extends HTMLElement {
      static get observedAttributes(): ReadonlyArray<string> {
        return ['draggable']
      }

      attributeChangedCallback(
        _name: string,
        oldValue: string | null,
        newValue: string | null,
      ): void {
        observations.push([oldValue, newValue])
      }
    }
    customElements.define('x-observed-draggable', XObservedDraggable)

    for (const value of [true, false]) {
      observations.length = 0
      const view = () =>
        customElement<Message>()('x-observed-draggable')([h.Draggable(value)])
      const element = mountServerHtml(serializeHydratable(buildView(view)))

      const hydrated = buildView(() => hydrateVNode(element, view()))

      expect(hydrated.elm).toBe(element)
      expect(element.getAttribute('draggable')).toBe(String(value))
      expect(observations).toEqual([[null, String(value)]])
    }
  })

  it('writes a typed global attribute without invoking a custom element property', () => {
    let idWrites = 0
    class XNativeId extends HTMLElement {
      override get id(): string {
        return 'component-id'
      }

      override set id(_value: string) {
        idWrites += 1
      }
    }
    customElements.define('x-native-id', XNativeId)
    const view = () =>
      customElement<Message>()('x-native-id')([h.Id('view-id')])
    const serverElement = mountServerHtml(serializeHydratable(buildView(view)))

    const hydrated = buildView(() => hydrateVNode(serverElement, view()))

    expect(hydrated.elm).toBe(serverElement)
    expect(serverElement.getAttribute('id')).toBe('view-id')
    expect(idWrites).toBe(0)

    const mount = document.createElement('div')
    host.replaceChildren(mount)
    const rendered = buildView(() =>
      patch(toVNode(mount), requireVNode(view())),
    )
    expect(rendered.elm).toBeInstanceOf(XNativeId)
    expect(elementOf(rendered).getAttribute('id')).toBe('view-id')
    expect(idWrites).toBe(0)
  })

  it('rebuilds a custom element with innerHTML without invoking its setter', () => {
    let holderConstructions = 0
    let childConstructions = 0
    let innerHtmlWrites = 0
    class XNativeInnerHtml extends HTMLElement {
      constructor() {
        super()
        holderConstructions += 1
      }

      override get innerHTML(): string {
        return 'component markup'
      }

      override set innerHTML(_value: string) {
        innerHtmlWrites += 1
      }
    }
    class XInnerProbe extends HTMLElement {
      constructor() {
        super()
        childConstructions += 1
      }
    }
    customElements.define('x-native-inner-html', XNativeInnerHtml)
    customElements.define('x-inner-probe', XInnerProbe)
    const view = () =>
      customElement<Message>()('x-native-inner-html')([
        h.InnerHTML('<x-inner-probe></x-inner-probe>'),
      ])
    const serverElement = mountServerHtml(serializeHydratable(buildView(view)))
    const serverChild = serverElement.firstElementChild
    expect(holderConstructions).toBe(1)
    expect(childConstructions).toBe(1)

    const hydrated = buildView(() => hydrateVNode(serverElement, view()))
    const hydratedElement = elementOf(hydrated)

    expect(hydratedElement).not.toBe(serverElement)
    expect(serverElement.isConnected).toBe(false)
    expect(hydratedElement.firstElementChild).toBeInstanceOf(XInnerProbe)
    expect(hydratedElement.firstElementChild).not.toBe(serverChild)
    expect(serverChild?.isConnected).toBe(false)
    expect(holderConstructions).toBe(2)
    expect(childConstructions).toBe(2)
    expect(innerHtmlWrites).toBe(0)

    const mount = document.createElement('div')
    host.replaceChildren(mount)
    const rendered = buildView(() =>
      patch(toVNode(mount), requireVNode(view())),
    )
    const renderedElement = elementOf(rendered)
    expect(renderedElement).toBeInstanceOf(XNativeInnerHtml)
    expect(renderedElement.firstElementChild).toBeInstanceOf(XInnerProbe)
    expect(holderConstructions).toBe(3)
    expect(childConstructions).toBe(3)
    expect(innerHtmlWrites).toBe(0)
  })

  it('keeps a client-only innerHTML property on the component setter', () => {
    let innerHtmlWrites = 0
    class XComponentInnerHtml extends HTMLElement {
      override set innerHTML(_value: string) {
        innerHtmlWrites += 1
      }
    }
    customElements.define('x-component-inner-html', XComponentInnerHtml)
    const view = () =>
      customElement<Message>()('x-component-inner-html')([
        Prop({ key: 'innerHTML', value: 'component value' }),
      ])
    const mount = document.createElement('div')
    host.appendChild(mount)

    const rendered = buildView(() =>
      patch(toVNode(mount), requireVNode(view())),
    )

    expect(rendered.elm).toBeInstanceOf(XComponentInnerHtml)
    expect(innerHtmlWrites).toBe(1)
    expect(elementOf(rendered).childNodes).toHaveLength(0)
  })

  it('gives the last equal-valued innerHTML write exclusive ownership', () => {
    let innerHtmlWrites = 0
    class XEqualInnerHtml extends HTMLElement {
      override set innerHTML(_value: string) {
        innerHtmlWrites += 1
      }
    }
    customElements.define('x-equal-inner-html', XEqualInnerHtml)
    const markup = '<span>same</span>'
    const mount = document.createElement('div')
    host.appendChild(mount)

    const clientOwned = buildView(() =>
      patch(
        toVNode(mount),
        requireVNode(
          customElement<Message>()('x-equal-inner-html')([
            h.InnerHTML(markup),
            Prop({ key: 'innerHTML', value: markup }),
          ]),
        ),
      ),
    )
    const clientOwnedElement = elementOf(clientOwned)

    expect(innerHtmlWrites).toBe(1)
    expect(clientOwnedElement.childNodes).toHaveLength(0)

    const nextMount = document.createElement('div')
    host.appendChild(nextMount)
    const trusted = buildView(() =>
      patch(
        toVNode(nextMount),
        requireVNode(
          customElement<Message>()('x-equal-inner-html')([
            Prop({ key: 'innerHTML', value: markup }),
            h.InnerHTML(markup),
          ]),
        ),
      ),
    )
    const trustedElement = elementOf(trusted)

    expect(innerHtmlWrites).toBe(1)
    expect(trustedElement.firstElementChild?.outerHTML).toBe(markup)
  })

  it('replaces a custom element host whose light DOM the view owns', () => {
    class XRetainedLightDom extends HTMLElement {
      ownerHost: HTMLElement | undefined

      connectedCallback(): void {
        if (this.parentElement instanceof HTMLElement) {
          this.ownerHost = this.parentElement
        }
      }

      disconnectedCallback(): void {
        const ownerHost = this.ownerHost
        if (ownerHost === undefined) {
          return
        }
        ownerHost.removeAttribute('title')
        const reinserted = this.ownerDocument.createElement('span')
        reinserted.setAttribute('data-owner', 'component-reinserted')
        ownerHost.appendChild(reinserted)
      }
    }
    class XLightDomOwner extends HTMLElement {
      componentChild: XRetainedLightDom | undefined
      ownerEarlierSibling: HTMLElement | undefined
      ownerParent: HTMLElement | undefined

      connectedCallback(): void {
        if (this.parentElement instanceof HTMLElement) {
          this.ownerParent = this.parentElement
        }
        if (this.previousElementSibling instanceof HTMLElement) {
          this.ownerEarlierSibling = this.previousElementSibling
        }
        if (this.childNodes.length > 0) {
          return
        }
        const child = this.ownerDocument.createElement('x-retained-light-dom')
        if (!(child instanceof XRetainedLightDom)) {
          throw new Error('expected an upgraded retained child')
        }
        child.setAttribute('data-owner', 'component')
        child.textContent = 'owned'
        this.componentChild = child
        this.appendChild(child)
      }

      disconnectedCallback(): void {
        this.ownerParent?.removeAttribute('title')
        this.ownerEarlierSibling?.removeAttribute('title')
        const earlierText = this.ownerEarlierSibling?.firstChild
        if (earlierText instanceof Text) {
          earlierText.data = 'component-mutated'
        }
      }

      mutateOwned(): void {
        if (this.componentChild !== undefined) {
          this.componentChild.textContent = 'component-mutated'
        }
      }
    }
    if (customElements.get('x-retained-light-dom') === undefined) {
      customElements.define('x-retained-light-dom', XRetainedLightDom)
    }
    if (customElements.get('x-light-dom-owner') === undefined) {
      customElements.define('x-light-dom-owner', XLightDomOwner)
    }

    const root = document.createElement('div')
    root.setAttribute('data-foldkit-build', BUILD_ID)
    root.setAttribute('title', 'parent-owned')
    host.appendChild(root)
    const earlierSibling = document.createElement('div')
    earlierSibling.setAttribute('id', 'earlier-sibling')
    earlierSibling.setAttribute('title', 'earlier-owned')
    earlierSibling.textContent = 'earlier-text'
    root.appendChild(earlierSibling)
    const element = document.createElement('x-light-dom-owner')
    if (!(element instanceof XLightDomOwner)) {
      throw new Error('expected an upgraded custom element')
    }
    element.setAttribute('title', 'view-owned')
    root.appendChild(element)
    const componentChild = element.componentChild
    expect(componentChild?.isConnected).toBe(true)

    const serverParagraph = document.createElement('p')
    serverParagraph.setAttribute('data-owner', 'view')
    serverParagraph.textContent = 'client'
    element.appendChild(serverParagraph)
    expect(element.childElementCount).toBe(2)

    const inserted: globalThis.Array<string> = []
    const viewParagraph = snabbdomH(
      'p',
      {
        attrs: { 'data-owner': 'view' },
        hook: { insert: () => inserted.push('paragraph') },
      },
      'client',
    )
    const viewElement = snabbdomH(
      'x-light-dom-owner',
      {
        attrs: { title: 'view-owned' },
        hook: { insert: () => inserted.push('custom-element') },
      },
      [viewParagraph],
    )
    const viewEarlierSibling = snabbdomH(
      'div',
      {
        attrs: { id: 'earlier-sibling', title: 'earlier-owned' },
        hook: { insert: () => inserted.push('earlier-sibling') },
      },
      'earlier-text',
    )
    const viewRoot = snabbdomH(
      'div',
      {
        attrs: { title: 'parent-owned' },
        hook: { insert: () => inserted.push('root') },
      },
      [viewEarlierSibling, viewElement],
    )
    const hydrated = buildView(() => hydrateVNode(root, viewRoot))

    const hydratedRoot = elementOf(hydrated)
    const hydratedElement = hydratedRoot.querySelector('x-light-dom-owner')
    if (!(hydratedElement instanceof XLightDomOwner)) {
      throw new Error('expected a rebuilt custom element')
    }
    const paragraphs = hydratedElement.querySelectorAll('p')
    expect(hydrated.elm).toBe(root)
    expect(root.getAttribute('title')).toBe('parent-owned')
    expect(earlierSibling.getAttribute('title')).toBe('earlier-owned')
    expect(earlierSibling.textContent).toBe('earlier-text')
    expect(inserted).toEqual([
      'earlier-sibling',
      'paragraph',
      'custom-element',
      'root',
    ])
    expect(hydratedElement).not.toBe(element)
    expect(element.isConnected).toBe(false)
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0]?.getAttribute('data-owner')).toBe('view')
    expect(paragraphs[0]?.textContent).toBe('client')
    expect(paragraphs[0]).not.toBe(componentChild)
    expect(paragraphs[0]).not.toBe(serverParagraph)
    expect(componentChild?.isConnected).toBe(false)
    expect(serverParagraph.isConnected).toBe(false)
    expect(hydratedElement.getAttribute('title')).toBe('view-owned')
    expect(
      hydratedElement.querySelector('[data-owner="component-reinserted"]'),
    ).toBeNull()
    expect(
      element.querySelector('[data-owner="component-reinserted"]'),
    ).not.toBeNull()

    element.mutateOwned()

    expect(paragraphs[0]?.textContent).toBe('client')
    expect(componentChild?.textContent).toBe('component-mutated')

    const mount = document.createElement('div')
    host.appendChild(mount)
    const fresh = buildView(() =>
      patch(
        toVNode(mount),
        snabbdomH('x-light-dom-owner', {}, [
          snabbdomH('p', { attrs: { 'data-owner': 'view' } }, 'client'),
        ]),
      ),
    )
    const freshElement = elementOf(fresh)

    expect(freshElement.querySelectorAll('p')).toHaveLength(1)
    expect(freshElement.firstElementChild?.getAttribute('data-owner')).toBe(
      'view',
    )
  })

  it('preserves the selected default state of a controlled select', () => {
    const selectView = () =>
      h.select(
        [h.Value('us')],
        [
          h.option([h.Value('')], ['Choose']),
          h.option([h.Value('us')], ['United States']),
        ],
      )
    const view = buildView(selectView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select root')
    }
    const serverOption = root.querySelector('option[value="us"]')
    expect(serverOption?.hasAttribute('selected')).toBe(true)

    buildView(() => hydrateVNode(root, selectView()))

    expect(root.querySelector('option[value="us"]')).toBe(serverOption)
    expect({
      hasSelected: serverOption?.hasAttribute('selected'),
      isDefaultSelected:
        serverOption instanceof HTMLOptionElement
          ? serverOption.defaultSelected
          : false,
      value: root.value,
    }).toEqual({ hasSelected: true, isDefaultSelected: true, value: 'us' })
  })

  it('preserves the default value of a controlled input', () => {
    const inputView = () => h.input([h.Type('text'), h.Value('hello')])
    const view = buildView(inputView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    expect(root.hasAttribute('value')).toBe(true)

    buildView(() => hydrateVNode(root, inputView()))

    expect(root.value).toBe('hello')
    expect(root.hasAttribute('value')).toBe(true)
    expect(root.defaultValue).toBe('hello')
  })

  it('preserves the default state of a controlled checkbox', () => {
    const checkboxView = () => h.input([h.Type('checkbox'), h.Checked(true)])
    const view = buildView(checkboxView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    expect(root.hasAttribute('checked')).toBe(true)

    buildView(() => hydrateVNode(root, checkboxView()))

    expect(root.checked).toBe(true)
    expect(root.hasAttribute('checked')).toBe(true)
    expect(root.defaultChecked).toBe(true)
  })

  it('restores unchanged raw selected ownership when a select becomes uncontrolled', () => {
    const controlledView = () =>
      h.select(
        [h.Value('b')],
        [
          h.option([h.Value('a'), h.Attribute('selected', '')], ['A']),
          h.option([h.Value('b')], ['B']),
        ],
      )
    const uncontrolledView = () =>
      h.select(
        [],
        [
          h.option([h.Value('a'), h.Attribute('selected', '')], ['A']),
          h.option([h.Value('b')], ['B']),
        ],
      )
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(toVNode(container), requireVNode(controlledView())),
    )
    const select = controlled.elm
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('expected a select')
    }

    const uncontrolled = buildView(() =>
      patch(controlled, requireVNode(uncontrolledView())),
    )
    const first = select.options.item(0)
    const second = select.options.item(1)

    expect(uncontrolled.elm).toBe(select)
    expect(select.value).toBe('a')
    expect(first?.selected).toBe(true)
    expect(first?.defaultSelected).toBe(true)
    expect(first?.hasAttribute('selected')).toBe(true)
    expect(second?.selected).toBe(false)
    expect(second?.defaultSelected).toBe(false)
    expect(second?.hasAttribute('selected')).toBe(false)
  })

  it('clears typed defaults when a same-named h.Prop takes ownership', () => {
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(toVNode(container), requireVNode(h.input([h.Value('controlled')]))),
    )
    const input = controlled.elm
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected an input')
    }

    buildView(() =>
      patch(
        controlled,
        requireVNode(h.input([Prop({ key: 'value', value: 'client-only' })])),
      ),
    )

    expect(input.value).toBe('client-only')
    expect(input.defaultValue).toBe('')
    expect(input.hasAttribute('value')).toBe(false)
  })

  it('writes equal values when ownership moves to h.Prop', () => {
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(
        toVNode(container),
        requireVNode(
          h.form(
            [],
            [
              h.input([h.Id('equal-value'), h.Value('same')]),
              h.input([
                h.Id('equal-checked'),
                h.Type('checkbox'),
                h.Checked(true),
              ]),
            ],
          ),
        ),
      ),
    )

    const released = buildView(() =>
      patch(
        controlled,
        requireVNode(
          h.form(
            [],
            [
              h.input([
                h.Id('equal-value'),
                Prop({ key: 'value', value: 'same' }),
              ]),
              h.input([
                h.Id('equal-checked'),
                h.Type('checkbox'),
                Prop({ key: 'checked', value: true }),
              ]),
            ],
          ),
        ),
      ),
    )
    const form = released.elm
    if (!(form instanceof HTMLFormElement)) {
      throw new Error('expected a form')
    }
    const value = form.querySelector<HTMLInputElement>('#equal-value')
    const checked = form.querySelector<HTMLInputElement>('#equal-checked')

    expect(value?.value).toBe('same')
    expect(value?.defaultValue).toBe('')
    expect(value?.hasAttribute('value')).toBe(false)
    expect(checked?.checked).toBe(true)
    expect(checked?.defaultChecked).toBe(false)
    expect(checked?.hasAttribute('checked')).toBe(false)

    form.reset()
    expect(value?.value).toBe('')
    expect(checked?.checked).toBe(false)
  })

  it('does not erase h.Prop innerHTML when a controlled value releases content', () => {
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(
        toVNode(container),
        requireVNode(h.output([h.Value('controlled')])),
      ),
    )
    const output = controlled.elm
    if (!(output instanceof HTMLOutputElement)) {
      throw new Error('expected an output')
    }

    buildView(() =>
      patch(
        controlled,
        requireVNode(
          h.output([
            Prop({
              key: 'innerHTML',
              value: '<span id="released">released</span>',
            }),
          ]),
        ),
      ),
    )

    expect(output.querySelector('#released')?.textContent).toBe('released')
  })

  it('restores output and select defaults after controlled content releases to InnerHTML', () => {
    const controlledView = () =>
      h.form(
        [],
        [
          h.output([h.Id('released-output'), h.Value('controlled')]),
          h.select(
            [h.Id('released-select'), h.Value('b')],
            [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
          ),
        ],
      )
    const releasedView = () =>
      h.form(
        [],
        [
          h.output([
            h.Id('released-output'),
            h.InnerHTML('<span id="output-child">output default</span>'),
          ]),
          h.select([
            h.Id('released-select'),
            h.InnerHTML(
              '<option value="a" selected>A</option><option value="b">B</option>',
            ),
          ]),
        ],
      )
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(toVNode(container), requireVNode(controlledView())),
    )

    buildView(() => patch(controlled, requireVNode(releasedView())))

    const output = document.querySelector<HTMLOutputElement>('#released-output')
    const select = document.querySelector<HTMLSelectElement>('#released-select')
    expect(output?.querySelector('#output-child')?.textContent).toBe(
      'output default',
    )
    expect(output?.value).toBe('output default')
    expect(output?.defaultValue).toBe('output default')
    expect({
      hasSelected: select?.querySelector('option')?.hasAttribute('selected'),
      innerHtml: select?.innerHTML,
      optionCount: select?.options.length,
      value: select?.value,
    }).toEqual({
      hasSelected: true,
      innerHtml:
        '<option value="a" selected="">A</option><option value="b">B</option>',
      optionCount: 2,
      value: 'a',
    })
  })

  it('restores native defaults when reflected typed properties leave the view', () => {
    const controlledView = () =>
      h.main(
        [],
        [
          h.input([h.Id('sized'), h.Size(3)]),
          h.div([h.Id('tabbed'), h.Tabindex(4), h.Title('owned')]),
          h.textarea([h.Id('area'), h.Cols(4), h.Rows(5)]),
          h.ol([h.Id('ordered'), h.Start(6)]),
        ],
      )
    const releasedView = () =>
      h.main(
        [],
        [
          h.input([h.Id('sized')]),
          h.div([h.Id('tabbed')]),
          h.textarea([h.Id('area')]),
          h.ol([h.Id('ordered')]),
        ],
      )
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(toVNode(container), requireVNode(controlledView())),
    )

    buildView(() => patch(controlled, requireVNode(releasedView())))

    const input = document.querySelector<HTMLInputElement>('#sized')
    const tabbed = document.querySelector<HTMLElement>('#tabbed')
    const textarea = document.querySelector<HTMLTextAreaElement>('#area')
    const ordered = document.querySelector<HTMLOListElement>('#ordered')
    expect(input?.hasAttribute('size')).toBe(false)
    expect(input?.size).toBe(document.createElement('input').size)
    expect(tabbed?.hasAttribute('tabindex')).toBe(false)
    expect(tabbed?.tabIndex).toBe(document.createElement('div').tabIndex)
    expect(tabbed?.hasAttribute('title')).toBe(false)
    expect(tabbed?.title).toBe('')
    expect(textarea?.hasAttribute('cols')).toBe(false)
    expect(textarea?.cols).toBe(document.createElement('textarea').cols)
    expect(textarea?.hasAttribute('rows')).toBe(false)
    expect(textarea?.rows).toBe(document.createElement('textarea').rows)
    expect(ordered?.hasAttribute('start')).toBe(false)
    expect(ordered?.start).toBe(document.createElement('ol').start)
  })

  it('keeps __proto__ as an own client-only property', () => {
    const payload = {
      innerHTML: '<script>window.__unexpected = true</script>',
      onclick: () => {
        throw new Error('prototype handler ran')
      },
    }
    const container = document.createElement('div')
    host.appendChild(container)
    const expectedPrototype = Object.getPrototypeOf(
      document.createElement('div'),
    )
    const mounted = buildView(() =>
      patch(
        toVNode(container),
        requireVNode(
          h.div([Prop({ key: '__proto__', value: payload })], ['safe']),
        ),
      ),
    )
    const element = mounted.elm
    if (!(element instanceof HTMLDivElement)) {
      throw new Error('expected a div')
    }

    expect(Object.getPrototypeOf(element)).toBe(expectedPrototype)
    expect(Object.hasOwn(element, '__proto__')).toBe(true)
    expect(Reflect.get(element, '__proto__')).toBe(payload)
    expect(element.textContent).toBe('safe')

    const released = buildView(() =>
      patch(mounted, requireVNode(h.div([], ['safe']))),
    )
    expect(released.elm).toBe(element)
    expect(Object.hasOwn(element, '__proto__')).toBe(false)
    expect(Object.getPrototypeOf(element)).toBe(expectedPrototype)
  })

  it('releases a controlled value safely after a raw file type takes effect', () => {
    const container = document.createElement('div')
    host.appendChild(container)
    const controlled = buildView(() =>
      patch(
        toVNode(container),
        requireVNode(h.input([h.Type('text'), h.Value('controlled')])),
      ),
    )
    const input = controlled.elm
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('expected an input')
    }

    buildView(() =>
      patch(
        controlled,
        requireVNode(
          h.input([
            h.Attribute('type', 'FiLe'),
            h.Attribute('value', 'default-file-name'),
          ]),
        ),
      ),
    )

    expect(input.type).toBe('file')
    expect(input.value).toBe('')
    expect(input.defaultValue).toBe('default-file-name')
    expect(input.getAttribute('value')).toBe('default-file-name')
  })

  it('removes stale server attributes, classes, and styles the client view drops', () => {
    const serverView = () =>
      h.a(
        [
          h.Class('stale'),
          h.DataAttribute('old', 'yes'),
          h.Href('/stale'),
          h.Style({ color: 'red' }),
        ],
        ['same'],
      )
    const clientView = () => h.a([h.Class('fresh'), h.Title('new')], ['same'])
    const root = mountServerHtml(serializeHydratable(buildView(serverView)))
    if (!(root instanceof HTMLAnchorElement)) {
      throw new Error('expected an anchor root')
    }

    buildView(() => hydrateVNode(root, clientView()))

    expect(root.className).toBe('fresh')
    expect(root.getAttribute('title')).toBe('new')
    expect(root.hasAttribute('data-old')).toBe(false)
    expect(root.hasAttribute('href')).toBe(false)
    expect(root.style.color).toBe('')
  })

  it('converges a deterministic class and style set through raw attributes', () => {
    const view = () =>
      h.div(
        [h.Attribute('class', 'same'), h.Attribute('style', 'color: blue')],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    buildView(() => hydrateVNode(root, view()))

    expect(root.getAttribute('class')).toBe('same')
    expect(root.className).toBe('same')
    expect(root.getAttribute('style')).toBe('color: blue')
    expect(root.style.color).toBe('blue')
  })

  it('hands hydrated typed style ownership to a raw style attribute', () => {
    const typedView = () =>
      h.div(
        [
          h.Style({
            color: 'red',
            borderLeftColor: 'red',
            margin: '1px',
            '--accent': 'old',
          }),
        ],
        ['content'],
      )
    const rawView = () =>
      h.div(
        [
          h.Attribute(
            'STYLE',
            'color: blue; border: 2px solid black; margin-left: 12px; --accent: next',
          ),
        ],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(typedView)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    const hydrated = buildView(() => hydrateVNode(root, typedView()))
    const updated = buildView(() => patch(hydrated, requireVNode(rawView())))

    expect(updated.elm).toBe(root)
    expect(root.style.color).toBe('blue')
    expect(root.style.borderLeftWidth).toBe('2px')
    expect(root.style.borderLeftStyle).toBe('solid')
    expect(root.style.borderLeftColor).toBe('black')
    expect(root.style.marginLeft).toBe('12px')
    expect(root.style.getPropertyValue('--accent')).toBe('next')
  })

  it('converges class and typed style state together', () => {
    const view = () =>
      h.div(
        [
          h.Attribute('class', 'raw'),
          h.Class('typed'),
          h.Style({ background: 'red', color: 'blue' }),
        ],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    buildView(() => hydrateVNode(root, view()))

    expect(root.classList.contains('raw')).toBe(true)
    expect(root.classList.contains('typed')).toBe(true)
    expect(root.style.background).toContain('red')
    expect(root.style.color).toBe('blue')
  })

  it('preserves raw and typed class ownership after hydration', () => {
    const initialView = () =>
      h.div([h.Attribute('class', 'raw-a'), h.Class('typed')], ['content'])
    const root = mountServerHtml(serializeHydratable(buildView(initialView)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    const hydrated = buildView(() => hydrateVNode(root, initialView()))
    const changedRawClass = buildView(() =>
      patch(
        hydrated,
        requireVNode(
          h.div(
            [h.Attribute('CLASS', 'raw-b shared'), h.Class('typed')],
            ['content'],
          ),
        ),
      ),
    )

    expect(changedRawClass.elm).toBe(root)
    expect(root.classList.contains('raw-a')).toBe(false)
    expect(root.classList.contains('raw-b')).toBe(true)
    expect(root.classList.contains('shared')).toBe(true)
    expect(root.classList.contains('typed')).toBe(true)

    const sharedClass = buildView(() =>
      patch(
        changedRawClass,
        requireVNode(
          h.div(
            [h.Attribute('class', 'raw-b shared'), h.Class('shared')],
            ['content'],
          ),
        ),
      ),
    )
    const rawClassOnly = buildView(() =>
      patch(
        sharedClass,
        requireVNode(
          h.div(
            [h.Attribute('class', 'raw-b shared'), h.Class('')],
            ['content'],
          ),
        ),
      ),
    )

    expect(rawClassOnly.elm).toBe(root)
    expect(root.classList.contains('raw-b')).toBe(true)
    expect(root.classList.contains('shared')).toBe(true)
    expect(root.classList.contains('typed')).toBe(false)
  })

  it('keeps uppercase raw HTML attributes during hydration', () => {
    const view = () =>
      h.div(
        [
          h.Attribute('DATA-X', 'same'),
          h.Attribute('CLASS', 'raw'),
          h.Class('typed'),
          h.Attribute('STYLE', 'background: red'),
        ],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    buildView(() => hydrateVNode(root, view()))

    expect(root.getAttribute('data-x')).toBe('same')
    expect(root.classList.contains('raw')).toBe(true)
    expect(root.classList.contains('typed')).toBe(true)
    expect(root.style.background).toContain('red')
  })

  it('normalizes raw foreign attribute casing during hydration', () => {
    const view = () =>
      h.svg([
        h.Attribute('viewbox', '0 0 10 10'),
        h.Attribute('data-Foo', 'same'),
      ])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof SVGElement)) {
      throw new Error('expected an svg root')
    }

    buildView(() => hydrateVNode(root, view()))

    expect(root.getAttribute('viewBox')).toBe('0 0 10 10')
    expect(root.hasAttribute('viewbox')).toBe(false)
    expect(root.getAttribute('data-foo')).toBe('same')
    expect(root.hasAttribute('data-Foo')).toBe(false)
  })

  it('replaces a hydration root whose namespace disagrees with the vnode', () => {
    const htmlSvg = document.createElement('svg')
    htmlSvg.setAttribute('data-foldkit-app', 'app')
    host.appendChild(htmlSvg)

    buildView(() => hydrateVNode(htmlSvg, h.svg([], [h.circle([])])))

    const root = host.firstElementChild
    expect(root).not.toBe(htmlSvg)
    expect(root?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('rebuilds an adopted element whose namespace disagrees with the DOM', () => {
    const root = mountServerHtml('<div><a>link</a></div>')
    const originalAnchor = root.firstElementChild

    buildView(() =>
      hydrateVNode(
        root,
        snabbdomH('div', {}, [
          snabbdomH('a', { ns: 'http://www.w3.org/2000/svg' }, 'link'),
        ]),
      ),
    )

    const anchor = root.firstElementChild
    expect(anchor).not.toBe(originalAnchor)
    expect(anchor?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('preserves a controlled textarea default so hydration matches a fresh boot', () => {
    const textareaView = () => h.textarea([h.Value('model')])
    const root = mountServerHtml(serializeHydratable(buildView(textareaView)))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }
    expect(root.textContent).toBe('model')

    buildView(() => hydrateVNode(root, textareaView()))

    expect(root.value).toBe('model')
    expect(root.defaultValue).toBe('model')
    expect(root.getAttribute('value')).toBeNull()
  })

  it('hydrates an internally built textarea preserving its server content', () => {
    const view = () => unrestrictedTextarea([], ['default text'])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }

    const patchedVNode = buildView(() => hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.value).toBe('default text')
  })

  it('hydrates empty text children without rebuilding the root', () => {
    const view = () => h.div([], ['', h.span([h.Id('inner')], ['x']), ''])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const span = root.querySelector('#inner')

    const patchedVNode = buildView(() => hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('#inner')).toBe(span)
  })

  it('hydrates a pre whose empty text precedes newline-prefixed text', () => {
    // The serializer pads this view to <pre>\n\nfirst</pre>; a real browser
    // strips one leading newline from <pre>, so the accepted server DOM holds
    // "\nfirst". (happy-dom's innerHTML parser does not strip it, so the DOM is
    // built directly to match what the render walk's parser and a browser see.)
    const root = document.createElement('pre')
    root.setAttribute('data-foldkit-build', BUILD_ID)
    root.textContent = '\nfirst'
    host.appendChild(root)

    const view = () => h.pre([], ['', '\nfirst'])
    const patchedVNode = buildView(() => hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.textContent).toBe('\nfirst')
  })

  it('rebuilds when the server element holds markup where the view expects text children', () => {
    const root = mountServerHtml('<p><b>stale</b> markup</p>')

    const patchedVNode = buildView(() =>
      hydrateVNode(root, h.p([], ['plain ', 'text'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toBe('plain text')
  })

  it('adopts comment children and text-shortcut elements', () => {
    const root = mountServerHtml('<div><!--note--><span>after</span></div>')
    const commentNode = root.firstChild

    const patchedVNode = hydrateVNode(
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
      hydrateVNode(root, h.div([h.Class('fresh')], [h.p([], ['fresh'])])),
    )

    expect(patchedVNode.elm).not.toBe(root)
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('div')
    expect(host.firstElementChild?.textContent).toBe('fresh')
  })

  it('hydrates a null view as a comment replacement', () => {
    const root = mountServerHtml('<div>stale</div>')

    const patchedVNode = buildView(() => hydrateVNode(root, null))

    expect(patchedVNode.sel).toBe('!')
    expect(host.firstElementChild).toBeNull()
  })
})

describe('__elementSignature', () => {
  it('is order-independent across attributes, classes, and styles', () => {
    const a = document.createElement('div')
    a.setAttribute('title', 'x')
    a.setAttribute('lang', 'en')
    a.className = 'one two'
    a.style.color = 'red'
    a.style.margin = '0px'

    const b = document.createElement('div')
    b.setAttribute('lang', 'en')
    b.setAttribute('title', 'x')
    b.className = 'two one'
    b.style.margin = '0px'
    b.style.color = 'red'

    const vnode = snabbdomH('div', {}, [])
    expect(__elementSignature(a, vnode)).toBe(__elementSignature(b, vnode))
  })

  it('catches a raw value attribute disagreement the client owns as an attribute', () => {
    const server = document.createElement('input')
    server.setAttribute('value', 'server')
    const client = document.createElement('input')
    client.setAttribute('value', 'client')

    const vnode = snabbdomH('input', { attrs: { value: 'client' } }, [])
    expect(__elementSignature(server, vnode)).not.toBe(
      __elementSignature(client, vnode),
    )
  })

  it('matches synchronized current and default controlled state', () => {
    const server = document.createElement('input')
    server.setAttribute('value', 'text')
    server.value = 'text'
    const client = document.createElement('input')
    client.value = 'text'
    client.defaultValue = 'text'

    const vnode = snabbdomH('input', { props: { value: 'text' } }, [])
    expect(__elementSignature(server, vnode)).toBe(
      __elementSignature(client, vnode),
    )
  })

  it('catches a props-managed value disagreement through the property', () => {
    const server = document.createElement('input')
    server.value = 'server'
    const client = document.createElement('input')
    client.value = 'client'

    const vnode = snabbdomH('input', { props: { value: 'client' } }, [])
    expect(__elementSignature(server, vnode)).not.toBe(
      __elementSignature(client, vnode),
    )
  })

  it('keeps attribute values with delimiter characters distinct', () => {
    const a = document.createElement('div')
    a.setAttribute('data-note', 'p:q;r|s')
    const b = document.createElement('div')
    b.setAttribute('data-note', 'p:q;r|t')

    const vnode = snabbdomH('div', {}, [])
    expect(__elementSignature(a, vnode)).not.toBe(__elementSignature(b, vnode))
  })
})
