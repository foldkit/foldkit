import { Context, Option, Schema } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as CustomElement from '../../customElement/index.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from '../../html/boundary.js'
import {
  type Html,
  Prop,
  __htmlBuilder,
  customElement,
} from '../../html/index.js'
import { clearRuntime, setRuntime } from '../../html/runtimeSingleton.js'
import {
  HYDRATION_IDENTITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  hydrationIdentityMarker,
  hydrationKeyMarker,
} from '../../hydrationMarkers.js'
import { defineMessageUnion } from '../../message/index.js'
import { markTrustedInnerHtml } from '../../propertyProvenance.js'
import { h as snabbdomH } from '../../snabbdom/index.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { __patchVNode } from '../../vdom.js'
import { serializeHtml } from './serialize.js'

const Message = defineMessageUnion({
  ClickedButton: {},
  EnteredFocusRegion: {},
  LeftFocusRegion: {},
})
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()
const unrestrictedTextarea = customElement<Message>()('textarea')
const elementWithTrustedInnerHtml = (
  tagName: string,
  innerHtml: string,
): VNode => {
  const props = { innerHTML: innerHtml }
  markTrustedInnerHtml(props, innerHtml)
  return snabbdomH(tagName, { props })
}

describe('serializeHtml', () => {
  let registry: BoundaryRegistry

  beforeEach(() => {
    registry = createBoundaryRegistry()
    setRuntime(() => {}, Context.empty(), registry)
    beginRender(registry)
  })

  afterEach(() => {
    clearRuntime()
  })

  it('serializes a null tree as an empty comment', () => {
    expect(serializeHtml(null)).toBe('<!---->')
  })

  it('escapes text content', () => {
    const view = h.div([], ['a < b & "c" > d'])
    expect(serializeHtml(view)).toBe('<div>a &lt; b &amp; "c" &gt; d</div>')
  })

  it('escapes a carriage return so text round-trips through an HTML parser', () => {
    const view = h.p([], ['a\r\nb'])
    const serialized = serializeHtml(view)
    expect(serialized).toBe('<p>a&#13;\nb</p>')

    const container = document.createElement('div')
    container.innerHTML = serialized
    expect(container.textContent).toBe('a\r\nb')
  })

  it('escapes attribute values', () => {
    const view = h.div([h.Title('a "quoted" <value> & more')])
    expect(serializeHtml(view)).toBe(
      '<div title="a &quot;quoted&quot; &lt;value> &amp; more"></div>',
    )
  })

  it('rejects attribute names that cannot be represented safely', () => {
    const view = h.div([h.Attribute('x=y onmouseover', 'alert(1)')])
    expect(() => serializeHtml(view)).toThrow('invalid attribute name')
  })

  it('does not treat a non-authored innerHTML property as raw markup', () => {
    // A property named `innerHTML` that did not come from `h.InnerHTML` (a
    // CustomElement.define property or an internal
    // `Prop({ key: 'innerHTML', value })`) carries no provenance marker, so the
    // serializer must never route it to the raw-HTML sink. The injected markup
    // is dropped rather than emitted verbatim.
    const view = snabbdomH('x-card', {
      props: { innerHTML: '<img src=x onerror=alert(1)>' },
    })
    expect(serializeHtml(view)).toBe('<x-card></x-card>')
  })

  it('renders builder-authored innerHTML as raw markup', () => {
    const view = h.div([h.InnerHTML('<b>trusted</b>')])
    expect(serializeHtml(view)).toBe('<div><b>trusted</b></div>')
  })

  it('does not treat innerHTML as raw markup when a later property overwrites it', () => {
    // Provenance belongs to the value, not to the props bag: a generic property
    // written after `h.InnerHTML` owns the name from then on, so the markup it
    // wrote never reaches the raw sink.
    const view = h.div([
      h.InnerHTML('<b>trusted</b>'),
      Prop({ key: 'innerHTML', value: '<img src=x onerror=alert(1)>' }),
    ])
    const serialized = serializeHtml(view)

    expect(serialized).not.toContain('onerror')
    expect(serialized).toBe('<div></div>')
  })

  it('renders builder-authored innerHTML when it overwrites an earlier property', () => {
    // The mirror of the case above: the last write owns the name, and here it is
    // the trusted one, so the trusted markup is what is emitted.
    const view = h.div([
      Prop({ key: 'innerHTML', value: '<img src=x onerror=alert(1)>' }),
      h.InnerHTML('<b>trusted</b>'),
    ])
    const serialized = serializeHtml(view)

    expect(serialized).not.toContain('onerror')
    expect(serialized).toBe('<div><b>trusted</b></div>')
  })

  it('does not treat a custom element innerHTML property as raw markup in either order', () => {
    // A `CustomElement.define` property named `innerHTML` is a client-only
    // component property. Declaring it beside `h.InnerHTML` must not launder it,
    // whichever the view writes last.
    const card = CustomElement.define({
      tag: 'x-inner',
      properties: { innerHTML: Schema.String },
      events: {},
    }).withMessage(h)

    const propertyLast = card([
      h.InnerHTML('<b>trusted</b>'),
      card.InnerHTML('<b>trusted</b>'),
    ])
    const trustedLast = card([
      card.InnerHTML('<b>trusted</b>'),
      h.InnerHTML('<b>trusted</b>'),
    ])

    expect(serializeHtml(propertyLast)).toBe('<x-inner></x-inner>')
    expect(serializeHtml(trustedLast)).toBe('<x-inner><b>trusted</b></x-inner>')
  })

  it('does not reflect declared custom element properties that collide with global attribute names', () => {
    // A `CustomElement.define` property is a client-only DOM property even when
    // it carries the name of a global HTML attribute, so none of these reach the
    // markup. The values would otherwise disclose component state the view never
    // rendered.
    const card = CustomElement.define({
      tag: 'x-card',
      properties: {
        id: Schema.Unknown,
        title: Schema.String,
        lang: Schema.String,
        dir: Schema.String,
        tabIndex: Schema.Number,
        hidden: Schema.Boolean,
        inert: Schema.Boolean,
        draggable: Schema.Boolean,
      },
      events: {},
    }).withMessage(h)

    const view = card([
      card.Id({ accountId: 42 }),
      card.Title('leaked-title'),
      card.Lang('leaked-lang'),
      card.Dir('leaked-dir'),
      card.TabIndex(3),
      card.Hidden(true),
      card.Inert(true),
      card.Draggable(true),
    ])

    expect(serializeHtml(view)).toBe('<x-card></x-card>')
  })

  it('reflects builder-authored global attributes on a custom element', () => {
    // The counterpart: `h.Id` sets the reflected `id` attribute every element
    // has, so it is real markup and still serializes.
    const plain = CustomElement.define({
      tag: 'x-plain',
      properties: {},
      events: {},
    }).withMessage(h)

    const view = plain([
      h.Id('card-1'),
      h.Title('Card'),
      h.Autofocus(true),
      h.Draggable(true),
    ])
    expect(serializeHtml(view)).toBe(
      '<x-plain id="card-1" title="Card" autofocus="" draggable="true"></x-plain>',
    )
    expect(serializeHtml(plain([h.Draggable(false)]))).toBe(
      '<x-plain draggable="false"></x-plain>',
    )
  })

  it('does not reflect custom element properties through native property maps', () => {
    // A custom element's `value` property is a client-only DOM property, not the
    // native input `value` attribute, so it must not reflect. Only the global
    // attributes every element carries survive on a custom element.
    const view = snabbdomH('x-card', {
      props: { value: { id: 1 }, id: 'card-1' },
    })
    expect(serializeHtml(view)).toBe('<x-card id="card-1"></x-card>')
  })

  it('rejects markup-significant text in a noscript element', () => {
    const view = h.noscript(
      [],
      ['<meta http-equiv="refresh" content="0;url=/evil">'],
    )
    expect(() => serializeHtml(view)).toThrow(
      '<noscript> text content contains markup',
    )
  })

  it('renders trusted innerHTML fallback markup inside a noscript element', () => {
    const view = h.noscript([h.InnerHTML('<p>Enable JavaScript</p>')])
    expect(serializeHtml(view)).toBe(
      '<noscript><p>Enable JavaScript</p></noscript>',
    )
  })

  it('escapes carriage returns in attribute values so they round-trip', () => {
    const view = h.div([h.Title('a\r\nb')])
    const serialized = serializeHtml(view)
    expect(serialized).toBe('<div title="a&#13;\nb"></div>')

    const container = document.createElement('div')
    container.innerHTML = serialized
    expect(container.firstElementChild?.getAttribute('title')).toBe('a\r\nb')
  })

  it('rejects NUL characters in text and attribute values', () => {
    expect(() => serializeHtml(h.div([], ['a\u0000b']))).toThrow('NUL')
    expect(() => serializeHtml(h.div([h.Title('a\u0000b')]))).toThrow('NUL')
  })

  it('serializes class, style, and data attributes', () => {
    const view = h.div([
      h.Class('card highlighted'),
      h.Style({ backgroundColor: 'red', '--accent': 'blue' }),
      h.DataAttribute('itemId', '42'),
    ])
    expect(serializeHtml(view)).toBe(
      '<div data-itemid="42" class="card highlighted" style="background-color: red; --accent: blue"></div>',
    )
  })

  it('normalizes supported style aliases without changing custom-property case', () => {
    const view = h.div([
      h.Style({
        '--Accent-色': 'blue',
        cssFloat: 'left',
        textAlign: 'center',
        webkitLineClamp: '2',
      }),
    ])

    expect(serializeHtml(view)).toContain(
      'style="--Accent-色: blue; float: left; text-align: center; -webkit-line-clamp: 2"',
    )
  })

  it('refuses unknown, duplicate, lifecycle, and nonstring style entries', () => {
    for (const build of [
      () => h.div([h.Style({ notARealProperty: 'x' })]),
      () =>
        h.div([
          h.Style({ backgroundColor: 'red', 'background-color': 'blue' }),
        ]),
      () => h.div([h.Style({ cssFloat: 'left', float: 'right' })]),
      () => h.div([h.Style({ remove: 'opacity' })]),
      () =>
        h.div([
          // JavaScript callers can cross the TypeScript boundary.
          Reflect.apply(h.Style, undefined, [{ opacity: 0.5 }]),
        ]),
    ]) {
      expect(build).toThrow(/h\.Style/)
    }
  })

  it('drops inherited style entries before either render path sees them', () => {
    const inherited: Record<string, string> = Object.create({
      color: 'red',
      cssText: 'position: fixed; inset: 0',
    })

    expect(serializeHtml(h.div([h.Style(inherited)]))).toBe('<div></div>')
  })

  it('refuses two owners of the style attribute under either ASCII casing', () => {
    for (const attributes of [
      [h.Attribute('style', 'color: red'), h.Style({ color: 'blue' })],
      [h.Style({ color: 'blue' }), h.Attribute('STYLE', 'color: red')],
    ]) {
      expect(() => h.div(attributes)).toThrow(/both h\.Style and a raw/)
    }
  })

  it('uses the last raw class and style spelling after HTML normalization', () => {
    const view = h.div([
      h.Attribute('CLASS', 'server-only'),
      h.Attribute('class', 'client-only'),
      h.Attribute('STYLE', 'position: fixed'),
      h.Attribute('style', 'color: red'),
    ])

    expect(serializeHtml(view)).toBe(
      '<div class="client-only" style="color: red"></div>',
    )
  })

  it('refuses style entries that become additional declarations only in server markup', () => {
    for (const build of [
      () => h.div([h.Style({ color: 'red; position: fixed; inset: 0' })]),
      () => h.div([h.Style({ color: 'red !important' })]),
      () => h.div([h.Style({ 'color; position': 'fixed' })]),
      () => h.div([h.Style({ cssText: 'color: red; position: fixed' })]),
      () => h.div([h.Style({ '--overlay': 'red; position: fixed' })]),
      () => h.div([h.Style({ color: String.raw`red\(; position: fixed` })]),
      () => h.div([h.Style({ color: 'red/*' })]),
      () => h.div([h.Style({ color: 'red)' })]),
    ]) {
      expect(build).toThrow(/h\.Style/)
    }
  })

  it('accepts escaped delimiters and balanced CSS value syntax', () => {
    const serialized = serializeHtml(
      h.div([
        h.Style({
          backgroundImage: 'url("data:image/svg+xml;a=b")',
          color: String.raw`red\;blue`,
          width: 'calc((1px + 2px))',
        }),
      ]),
    )

    expect(serialized).toContain('background-image: url(&quot;data:image')
    expect(serialized).toContain(String.raw`color: red\;blue`)
    expect(serialized).toContain('width: calc((1px + 2px))')
  })

  it('accepts a semicolon inside a single CSS value', () => {
    const serialized = serializeHtml(
      h.div([
        h.Style({
          backgroundImage:
            'url(data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E)',
        }),
      ]),
    )

    expect(serialized).toContain(
      'style="background-image: url(data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E)"',
    )
  })

  it('serializes prop-backed attributes with renamed names', () => {
    const view = h.label(
      [h.Id('username-label'), h.For('username'), h.Tabindex(2)],
      ['Username'],
    )
    expect(serializeHtml(view)).toBe(
      '<label id="username-label" for="username" tabindex="2">Username</label>',
    )
  })

  it('serializes boolean properties as bare attributes when true', () => {
    const view = h.input([
      h.Type('checkbox'),
      h.Checked(true),
      h.Disabled(false),
      h.Required(true),
    ])
    expect(serializeHtml(view)).toBe(
      '<input type="checkbox" checked="" required="">',
    )
  })

  it('serializes draggable as an enumerated attribute', () => {
    const view = h.div([h.Draggable(false)])
    expect(serializeHtml(view)).toBe('<div draggable="false"></div>')
  })

  it('serializes the value property on inputs', () => {
    const view = h.input([h.Type('text'), h.Value('hello')])
    expect(serializeHtml(view)).toBe('<input type="text" value="hello">')
  })

  it('serializes textarea value as escaped content', () => {
    const view = h.textarea([h.Value('line <one> & two')])
    expect(serializeHtml(view)).toBe(
      '<textarea>line &lt;one&gt; &amp; two</textarea>',
    )
  })

  it('serializes script and style content raw', () => {
    const script = h.script([], ['const x = 1 && 2;'])
    expect(serializeHtml(script)).toBe('<script>const x = 1 && 2;</script>')
    const style = h.style([], ['.a { color: red }'])
    expect(serializeHtml(style)).toBe('<style>.a { color: red }</style>')
  })

  it('rejects a closing-tag sequence inside raw-text content', () => {
    const script = h.script([], ['</script><script>alert(1)</script>'])
    expect(() => serializeHtml(script)).toThrow('</script')
    const dynamicScript = customElement<never>()('SCRIPT')(
      [],
      ['</script><script>alert(1)</script>'],
    )
    expect(() => serializeHtml(dynamicScript)).toThrow('</script')
    const style = h.style([], ['</style><script>evil()</script>'])
    expect(() => serializeHtml(style)).toThrow('</style')
  })

  it('allows a closing-tag prefix that continues into a longer name', () => {
    const script = h.script([], ['const tag = "</scripting"'])
    expect(serializeHtml(script)).toBe(
      '<script>const tag = "</scripting"</script>',
    )
  })

  it('rejects a raw-text closing-tag sequence followed by a carriage return', () => {
    const script = h.script([], ['const html = "</script\r>"'])
    expect(() => serializeHtml(script)).toThrow('</script')
    const style = h.style([], ['.a::after { content: "</style\r>" }'])
    expect(() => serializeHtml(style)).toThrow('</style')
  })

  it('rejects a tag name carrying markup so it cannot inject elements', () => {
    const injected: VNode = {
      sel: 'x-a><script>globalThis.pwned=1</script><x-a',
      data: {},
      children: [],
      elm: undefined,
      text: undefined,
      key: undefined,
    }
    expect(() => serializeHtml(injected)).toThrow('invalid tag name')
  })

  it('rejects a <!-- sequence in script content that would escape the parser', () => {
    const script = h.script([], ['<!--<script>globalThis.pwned=1;'])
    expect(() => serializeHtml(script)).toThrow('<!--')
    const throughInnerHtml = h.script([h.InnerHTML('<!--<script>evil()')])
    expect(() => serializeHtml(throughInnerHtml)).toThrow('<!--')
  })

  it('leaves a <!-- sequence in non-script raw text alone', () => {
    const style = h.style([], ['/* <!-- not special in CSS --> */'])
    expect(serializeHtml(style)).toBe(
      '<style>/* <!-- not special in CSS --> */</style>',
    )
  })

  it('serializes a moderately deep tree without exhausting the stack', () => {
    let node: Html = h.span([], ['leaf'])
    for (let level = 0; level < 200; level += 1) {
      node = h.div([], [node])
    }
    expect(serializeHtml(node)).toContain('<span>leaf</span>')
  })

  it('refuses a tree nested past the maximum render depth', () => {
    let node: Html = h.span([], ['leaf'])
    for (let level = 0; level < 1500; level += 1) {
      node = h.div([], [node])
    }
    expect(() => serializeHtml(node)).toThrow('maximum render depth')
  })

  it('rejects a terminating sequence inside comment text', () => {
    const comment: VNode = {
      sel: '!',
      data: {},
      children: undefined,
      elm: undefined,
      text: '--><script>evil()</script>',
      key: undefined,
    }
    expect(() => serializeHtml(comment)).toThrow('comment')
  })

  it('preserves a leading newline in controlled textarea content', () => {
    const view = h.textarea([h.Value('\nfirst line')])
    expect(serializeHtml(view)).toBe('<textarea>\n\nfirst line</textarea>')
  })

  it('preserves a leading newline in internally built textarea content', () => {
    const view = unrestrictedTextarea([], ['\nfirst line'])
    expect(serializeHtml(view)).toBe('<textarea>\n\nfirst line</textarea>')
  })

  it('preserves a leading newline in pre content', () => {
    const view = h.pre([], ['\nline1'])
    expect(serializeHtml(view)).toBe('<pre>\n\nline1</pre>')
  })

  it('rejects a closing-tag sequence arriving through InnerHTML on raw-text elements', () => {
    const script = h.script([h.InnerHTML('</script><script>alert(1)</script>')])
    expect(() => serializeHtml(script)).toThrow('</script')
    const div = h.div([h.InnerHTML('</script> is fine outside raw text')])
    expect(serializeHtml(div)).toBe(
      '<div></script> is fine outside raw text</div>',
    )
  })

  it('keeps an empty value attribute on an option', () => {
    const view = h.select(
      [],
      [
        h.option([h.Value('')], ['Choose']),
        h.option([h.Value('us')], ['United States']),
      ],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option value="">Choose</option><option value="us">United States</option></select>',
    )
  })

  it('marks the option matching a controlled select value as selected', () => {
    const view = h.select(
      [h.Value('us')],
      [
        h.option([h.Value('')], ['Choose']),
        h.option([h.Value('us')], ['United States']),
      ],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option value="">Choose</option><option value="us" selected="">United States</option></select>',
    )
  })

  it('matches a controlled select value against option text when no value attribute is set', () => {
    const view = h.select(
      [h.Value('Two')],
      [h.option([], ['One']), h.option([], ['Two'])],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option>One</option><option selected="">Two</option></select>',
    )
  })

  it('collapses option label whitespace when matching a controlled select value', () => {
    const view = h.select(
      [h.Value('Two words')],
      [h.option([], ['One']), h.option([], ['Two\n      words'])],
    )
    expect(serializeHtml(view)).toBe(
      '<select><option>One</option><option selected="">Two\n      words</option></select>',
    )
  })

  it('serializes the default state of an empty controlled input', () => {
    const view = h.input([h.Type('text'), h.Value('')])
    expect(serializeHtml(view)).toBe('<input type="text" value="">')
  })

  it('omits end tags for void elements', () => {
    const view = h.div([], [h.br([]), h.img([h.Src('/cat.png'), h.Alt('cat')])])
    expect(serializeHtml(view)).toBe(
      '<div><br><img src="/cat.png" alt="cat"></div>',
    )
  })

  it('drops event handlers and emits no key marker when the render is not hydratable', () => {
    // Event handlers and mount markers are client behavior and never serialize.
    // The key marker is part of the hydration handoff, so output nobody will
    // hydrate carries none of it either.
    const view = h.keyed('button')(
      'submit',
      [
        h.OnClick(Message.ClickedButton(), {
          defaultAction: 'Prevent',
          propagation: 'Stop',
        }),
        h.Id('submit'),
      ],
      ['Send'],
    )
    expect(serializeHtml(view)).toBe('<button id="submit">Send</button>')
  })

  it('drops focus boundary handlers', () => {
    const view = h.div(
      [
        h.Id('editor'),
        h.OnFocusEnter(Message.EnteredFocusRegion()),
        h.OnFocusLeave(Message.LeftFocusRegion()),
      ],
      [h.input([h.AriaLabel('Editor input')])],
    )

    expect(serializeHtml(view)).toBe(
      '<div id="editor"><input aria-label="Editor input"></div>',
    )
  })

  it('stamps a hydratable key as a fingerprint rather than the key itself', () => {
    // A key is application data (a row id, an account identifier, an email) that
    // the view never renders, so hydration compares fingerprints and the key
    // itself never reaches the markup.
    const view = h.keyed('li')('user@example.com', [], ['Ada'])
    const serialized = serializeHtml(view, { emitHydrationMarkers: true })

    expect(serialized).not.toContain('user@example.com')
    expect(serialized).toBe(
      `<li ${HYDRATION_KEY_ATTRIBUTE}="${hydrationKeyMarker('user@example.com')}">Ada</li>`,
    )
  })

  it('stamps a hydratable view identity as a fingerprint rather than the source path', () => {
    // The compiler's identity spells out a relative source path and function
    // name. Fingerprinting it keeps the build's file layout out of public HTML.
    const view = h.div([], ['Home'])
    if (view === null) {
      throw new Error('expected the view to produce a vnode')
    }
    view.identity = 'src/page/account/billing.ts:BillingView'
    const serialized = serializeHtml(view, { emitHydrationMarkers: true })

    expect(serialized).not.toContain('src/page/account/billing.ts')
    expect(serialized).not.toContain('BillingView')
    expect(serialized).toBe(
      `<div ${HYDRATION_IDENTITY_ATTRIBUTE}="${hydrationIdentityMarker('src/page/account/billing.ts:BillingView')}">Home</div>`,
    )
  })

  it('fingerprints a numeric key differently from the same digits as a string', () => {
    // The runtime compares keys with `===`, so 1 and '1' are different keys. A
    // fingerprint that collapsed them would let a numeric server row adopt a
    // string client row, carrying one row's typed state onto another.
    const numeric = serializeHtml(h.keyed('li')(1, [], ['one']), {
      emitHydrationMarkers: true,
    })
    const string = serializeHtml(h.keyed('li')('1', [], ['one']), {
      emitHydrationMarkers: true,
    })

    expect(numeric).not.toBe(string)
    expect(hydrationKeyMarker(1)).not.toBe(hydrationKeyMarker('1'))
  })

  it('refuses to render an element keyed by NaN as hydratable', () => {
    expect(hydrationKeyMarker(Number.NaN)).toBeUndefined()

    const view = h.keyed('li')(Number.NaN, [], ['one'])
    expect(() => serializeHtml(view, { emitHydrationMarkers: true })).toThrow(
      'keyed by NaN',
    )
    expect(serializeHtml(view)).toBe('<li>one</li>')
  })

  it('refuses to render an element keyed by a symbol as hydratable', () => {
    // A local symbol is a new value in every realm, so the server's key and the
    // client's cannot be compared. Rejecting beats adopting on a guess.
    const view = h.keyed('li')(Symbol('row'), [], ['one'])
    expect(() => serializeHtml(view, { emitHydrationMarkers: true })).toThrow(
      'keyed by a symbol',
    )
  })

  it('filters null children', () => {
    const view = h.ul([], [h.li([], ['one']), h.empty, h.li([], ['two'])])
    expect(serializeHtml(view)).toBe('<ul><li>one</li><li>two</li></ul>')
  })

  it('serializes svg subtrees', () => {
    const view = h.svg(
      [h.ViewBox('0 0 10 10')],
      [h.path([h.D('M0 0L10 10'), h.Fill('none')])],
    )
    expect(serializeHtml(view)).toBe(
      '<svg viewBox="0 0 10 10"><path d="M0 0L10 10" fill="none"></path></svg>',
    )
  })

  it('normalizes foreign attributes the way the HTML parser does', () => {
    const svg = h.svg([
      h.Attribute('viewbox', '0 0 10 10'),
      h.Attribute('data-Foo', 'value'),
    ])
    const math = h.math([h.Attribute('definitionurl', '/definition')])

    expect(serializeHtml(svg)).toBe(
      '<svg viewBox="0 0 10 10" data-foo="value"></svg>',
    )
    expect(serializeHtml(math)).toBe(
      '<math definitionURL="/definition"></math>',
    )
  })

  it('neutralizes a javascript: URL on navigation and resource attributes', () => {
    expect(serializeHtml(h.a([h.Href('javascript:evil()')], ['go']))).toBe(
      '<a href="">go</a>',
    )
    expect(serializeHtml(h.img([h.Src('vbscript:evil()')]))).toBe(
      '<img src="">',
    )
    expect(serializeHtml(h.form([h.Action('JavaScript:evil()')]))).toBe(
      '<form action=""></form>',
    )
  })

  it('neutralizes a javascript: URL obfuscated with control characters', () => {
    const view = h.a([h.Href('java\tscript:evil()')], ['go'])
    expect(serializeHtml(view)).toBe('<a href="">go</a>')
  })

  it('leaves safe URLs on navigation attributes unchanged', () => {
    expect(serializeHtml(h.a([h.Href('/route?x=a:b')], ['go']))).toBe(
      '<a href="/route?x=a:b">go</a>',
    )
    expect(
      serializeHtml(h.a([h.Href('mailto:hi@example.com')], ['mail'])),
    ).toBe('<a href="mailto:hi@example.com">mail</a>')
  })

  it('escapes text children of a foreign-namespace script instead of emitting raw text', () => {
    const view = h.svg([], [h.script([], ['<img src=x onerror="evil()">'])])
    const serialized = serializeHtml(view)
    expect(serialized).not.toContain('<img')
    expect(serialized).toBe(
      '<svg><script>&lt;img src=x onerror="evil()"&gt;</script></svg>',
    )
  })

  it('closes an HTML void element name in the SVG namespace so siblings stay siblings', () => {
    const view = h.svg([], [h.input([]), h.circle([])])
    expect(serializeHtml(view)).toBe(
      '<svg><input></input><circle></circle></svg>',
    )
  })

  it('treats an HTML void element as void inside a foreignObject integration point', () => {
    const view = h.svg([], [h.foreignObject([], [h.input([])])])
    expect(serializeHtml(view)).toBe(
      '<svg><foreignObject><input></foreignObject></svg>',
    )
  })

  it('serializes HTML content inside an SVG desc in the HTML namespace', () => {
    const view = h.svg([], [h.desc([], [h.input([])])])
    expect(serializeHtml(view)).toBe('<svg><desc><input></desc></svg>')
  })

  it('serializes HTML content wrapped in a foreignObject', () => {
    const view = h.svg([], [h.foreignObject([], [h.div([], ['inside'])])])
    expect(serializeHtml(view)).toBe(
      '<svg><foreignObject><div>inside</div></foreignObject></svg>',
    )
  })

  it('serializes iframe text children as raw text, not escaped', () => {
    const view = h.iframe([], ['<b>&'])
    expect(serializeHtml(view)).toBe('<iframe><b>&</iframe>')
  })

  it('rejects iframe content that contains a closing-tag sequence', () => {
    const view = h.iframe([], ['</iframe>'])
    expect(() => serializeHtml(view)).toThrow(/<\/iframe/)
  })

  it('emits InnerHTML raw', () => {
    const view = h.div([h.InnerHTML('<em>raw</em>')])
    expect(serializeHtml(view)).toBe('<div><em>raw</em></div>')
  })

  it('stamps root attributes on the root element only', () => {
    const view = h.div([h.Class('page')], [h.span([], ['inner'])])
    expect(
      serializeHtml(view, { rootAttributes: { 'data-mark': 'yes' } }),
    ).toBe('<div class="page" data-mark="yes"><span>inner</span></div>')
  })

  it('lets a root attribute win over a same-named attribute from the view', () => {
    const view = h.div([h.DataAttribute('mark', 'spoofed')])
    expect(
      serializeHtml(view, { rootAttributes: { 'data-mark': 'yes' } }),
    ).toBe('<div data-mark="yes"></div>')
  })

  it('serializes deeply nested trees', () => {
    const item = (label: string): Html =>
      h.li([h.Class('item')], [h.span([], [label])])
    const view = h.main([], [h.section([], [h.ul([], [item('a'), item('b')])])])
    expect(serializeHtml(view)).toBe(
      '<main><section><ul><li class="item"><span>a</span></li><li class="item"><span>b</span></li></ul></section></main>',
    )
  })
})

describe('unrepresentable serialized values', () => {
  it('rejects an unpaired surrogate in text and attributes', () => {
    // The value survives in memory and is destroyed by the UTF-8 encoding every
    // HTTP response and generated file performs, so what a visitor receives is
    // not what the view rendered.
    expect(() => serializeHtml(h.p([], ['before\uD800after']))).toThrow(
      /unpaired surrogate/,
    )
    expect(() =>
      serializeHtml(h.p([h.Title('before\uDC00after')], ['x'])),
    ).toThrow(/unpaired surrogate/)
  })

  it('accepts a well-formed surrogate pair', () => {
    expect(serializeHtml(h.p([], ['\uD83D\uDE80']))).toContain('\uD83D\uDE80')
  })

  it('rejects a NUL or carriage return in raw-text content', () => {
    expect(() => serializeHtml(h.style([h.InnerHTML('a\u0000b')]))).toThrow(
      /NUL/,
    )
    expect(() => serializeHtml(h.style([h.InnerHTML('a\rb')]))).toThrow(
      /carriage return/,
    )
  })

  it('rejects a NUL or carriage return in comment content', () => {
    const commentWith = (text: string): VNode => ({
      sel: '!',
      data: {},
      children: undefined,
      elm: undefined,
      text,
      key: undefined,
    })

    expect(() => serializeHtml(commentWith('a\u0000b'))).toThrow(/NUL/)
    expect(() => serializeHtml(commentWith('a\rb'))).toThrow(/carriage return/)
  })
})

describe('raw text and RCDATA coverage', () => {
  it('treats xmp, noembed, and noframes as raw text', () => {
    for (const tagName of ['xmp', 'noembed', 'noframes']) {
      expect(() =>
        serializeHtml(
          customElement<never>()(tagName)([
            h.InnerHTML(`</${tagName}><img src=x onerror=alert(1)>`),
          ]),
        ),
      ).toThrow(new RegExp(`</${tagName} sequence`))
    }
  })

  it('rejects a closing sequence in trusted textarea and title markup', () => {
    // RCDATA ends at the element's own closing tag, so markup written here
    // closes it and puts the rest of the fragment in the document.
    expect(() =>
      serializeHtml(
        elementWithTrustedInnerHtml(
          'textarea',
          '</textarea><img src=x onerror=alert(1)>',
        ),
      ),
    ).toThrow(/<\/textarea sequence/)
    expect(() =>
      serializeHtml(
        h.title([h.InnerHTML('</title><img src=x onerror=alert(1)>')]),
      ),
    ).toThrow(/<\/title sequence/)
  })
})

describe('trusted InnerHTML in newline-dropping elements', () => {
  // An HTML parser drops one newline right after the start tag of <pre>,
  // <listing>, and <textarea>. Assigning the same string to
  // `element.innerHTML` on the client keeps whatever the fragment begins with,
  // so the prefix is what makes the served first paint and a fresh render
  // agree. It is unconditional: a leading newline also arrives from a character
  // reference and from input preprocessing turning CR or CRLF into LF, and
  // neither is a literal newline in the fragment's own bytes.
  const PADDED_TAGS = ['pre', 'listing', 'textarea']

  it('prefixes one newline whatever the fragment begins with', () => {
    for (const tagName of PADDED_TAGS) {
      for (const fragment of [
        '',
        'foo',
        '\nfoo',
        '&#10;foo',
        '&#xA;foo',
        '&NewLine;foo',
      ]) {
        const html = serializeHtml(
          elementWithTrustedInnerHtml(tagName, fragment),
        )

        expect(html, `${tagName} ${JSON.stringify(fragment)}`).toBe(
          `<${tagName}>\n${fragment}</${tagName}>`,
        )
      }
    }
  })

  it('prefixes one newline for CR and CRLF where they are representable', () => {
    // A <textarea> is RCDATA and refuses a carriage return outright, since
    // input preprocessing rewrites it before the tokenizer runs. In <pre> and
    // <listing> the fragment carries it, and preprocessing turns it into the
    // leading newline the parser then drops.
    for (const tagName of ['pre', 'listing']) {
      for (const fragment of ['\rfoo', '\r\nfoo']) {
        const html = serializeHtml(
          customElement<never>()(tagName)([h.InnerHTML(fragment)]),
        )

        expect(html, `${tagName} ${JSON.stringify(fragment)}`).toBe(
          `<${tagName}>\n${fragment}</${tagName}>`,
        )
      }
    }

    expect(() =>
      serializeHtml(elementWithTrustedInnerHtml('textarea', '\rfoo')),
    ).toThrow(/carriage return/)
  })

  it('does not pad an element that keeps its leading newline', () => {
    expect(serializeHtml(h.div([h.InnerHTML('\nfoo')]))).toContain(
      '<div>\nfoo</div>',
    )
  })
})

describe('one owner for an element\u2019s content', () => {
  // Raw HTML owns the whole of an element's content. A view that also declares
  // children, or a controlled value, has named a second owner, and the two
  // disagree: the serializer emits the raw HTML alone while a browser assigns
  // the property and then appends the children or reasserts the value. The
  // refusal is at the builder, so a server render, a fresh client render, and a
  // hydration all reject the same view rather than diverging quietly.
  it('rejects InnerHTML alongside children', () => {
    expect(() =>
      h.div([h.InnerHTML('<b>raw</b>')], [h.span([], ['child'])]),
    ).toThrow(/both h.InnerHTML and children/)
  })

  it('rejects InnerHTML alongside children on a keyed element', () => {
    expect(() =>
      h.keyed('div')('k', [h.InnerHTML('<b>raw</b>')], [h.span([], ['child'])]),
    ).toThrow(/both h.InnerHTML and children/)
  })

  it('rejects a client-only innerHTML property alongside children', () => {
    expect(() =>
      h.div(
        [Prop({ key: 'innerHTML', value: '<b>property</b>' })],
        [h.span([], ['child'])],
      ),
    ).toThrow(/both a client-only innerHTML property and children/)
  })

  it('rejects InnerHTML alongside a controlled value', () => {
    for (const build of [
      () => h.output([h.InnerHTML('<b>raw</b>'), h.Value('model')]),
      () => h.select([h.InnerHTML('<option></option>'), h.Value('model')]),
    ]) {
      expect(build).toThrow(/both h.InnerHTML and a controlled value/)
    }
  })

  it('rejects either innerHTML owner on a textarea', () => {
    expect(() => unrestrictedTextarea([h.InnerHTML('<b>raw</b>')])).toThrow(
      /must use h.Value/,
    )
    expect(() =>
      unrestrictedTextarea([
        Prop({ key: 'innerHTML', value: '<b>property</b>' }),
      ]),
    ).toThrow(/must use h.Value/)
  })

  it('rejects a client-only innerHTML property alongside a controlled value', () => {
    expect(() =>
      h.output([
        Prop({ key: 'innerHTML', value: '<b>property</b>' }),
        h.Value('model'),
      ]),
    ).toThrow(/both a client-only innerHTML property and a controlled value/)
  })

  it('rejects InnerHTML on an element that holds no content', () => {
    expect(() => h.input([h.InnerHTML('<b>raw</b>')])).toThrow(
      /cannot hold content/,
    )
    expect(() => h.img([h.InnerHTML('<b>raw</b>')])).toThrow(
      /cannot hold content/,
    )
  })

  it('rejects a client-only innerHTML property on a void element', () => {
    expect(() =>
      h.input([Prop({ key: 'innerHTML', value: '<b>property</b>' })]),
    ).toThrow(/cannot hold content/)
  })

  it('accepts InnerHTML as the only owner', () => {
    expect(serializeHtml(h.div([h.InnerHTML('<b>raw</b>')]))).toContain(
      '<div><b>raw</b></div>',
    )
    expect(serializeHtml(h.textarea([h.Value('model')]))).toContain('model')
  })
})

describe('controlled select selection ownership', () => {
  const selectLikeDefinition = CustomElement.define({
    tag: 'x-select-like',
    properties: { value: Schema.Unknown },
    events: {},
  })
  const expectClientOnlyValueRefusal = (view: Html, name: string): void => {
    expect(() => serializeHtml(view), name).toThrow(
      /client-only value property/,
    )
    expect(
      () => serializeHtml(view, { emitHydrationMarkers: true }),
      name,
    ).toThrow(/client-only value property/)
  }

  it('refuses every client-only value on a native select', () => {
    const selectLike = selectLikeDefinition.withMessage(h)
    for (const value of ['b', 1, null, undefined, Symbol('value'), { id: 1 }]) {
      expectClientOnlyValueRefusal(
        h.select([selectLike.Value(value)]),
        `client-only ${typeof value}`,
      )
    }
  })

  it('refuses the client-only value across select arrangements', () => {
    const selectLike = selectLikeDefinition.withMessage(h)
    const arrangements: ReadonlyArray<Readonly<{ name: string; view: Html }>> =
      [
        {
          name: 'direct options',
          view: h.select(
            [selectLike.Value('b')],
            [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
          ),
        },
        {
          name: 'duplicate option values',
          view: h.select(
            [selectLike.Value('b')],
            [
              h.option([h.Value('b')], ['First']),
              h.option([h.Value('b')], ['Second']),
            ],
          ),
        },
        {
          name: 'an optgroup descendant',
          view: h.select(
            [selectLike.Value('b')],
            [
              h.optgroup(
                [],
                [
                  h.option([h.Value('a')], ['A']),
                  h.option([h.Value('b')], ['B']),
                ],
              ),
            ],
          ),
        },
        {
          name: 'a multiple select',
          view: h.select(
            [selectLike.Value('b'), h.Multiple(true)],
            [h.option([h.Value('b')], ['B'])],
          ),
        },
        {
          name: 'a sized select',
          view: h.select(
            [selectLike.Value('b'), h.Size(2)],
            [h.option([h.Value('b')], ['B'])],
          ),
        },
        {
          name: 'raw value and selected attributes',
          view: h.select(
            [h.Attribute('value', 'a'), selectLike.Value('b')],
            [h.option([h.Value('a'), h.Attribute('selected', '')], ['A'])],
          ),
        },
        {
          name: 'a dynamic uppercase native select',
          view: customElement<Message>()('SELECT')(
            [selectLike.Value('b')],
            [h.option([h.Value('b')], ['B'])],
          ),
        },
      ]

    for (const { name, view } of arrangements) {
      expectClientOnlyValueRefusal(view, name)
    }
  })

  it('uses the last property builder as the select value owner', () => {
    const selectLike = selectLikeDefinition.withMessage(h)
    const options = [
      h.option([h.Value('a')], ['A']),
      h.option([h.Value('b')], ['B']),
    ]
    expectClientOnlyValueRefusal(
      h.select([h.Value('a'), selectLike.Value('b')], options),
      'client-only property written last',
    )
    expect(
      serializeHtml(h.select([selectLike.Value('b'), h.Value('a')], options)),
    ).toBe(
      '<select><option value="a" selected="">A</option>' +
        '<option value="b">B</option></select>',
    )
  })

  it('canonicalizes a dynamic HTML tag before applying select semantics', () => {
    const dynamicSelect = (): Html =>
      customElement<never>()('SELECT')(
        [h.Value('b')],
        [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
      )
    const html = serializeHtml(dynamicSelect())
    expect(html).toBe(
      '<select><option value="a">A</option>' +
        '<option value="b" selected="">B</option></select>',
    )

    const servedHost = document.createElement('div')
    servedHost.innerHTML = html
    const served = servedHost.firstElementChild
    const freshHost = document.createElement('div')
    const mount = document.createElement('div')
    freshHost.appendChild(mount)
    const fresh = __patchVNode(Option.none(), dynamicSelect(), mount).elm
    if (!(served instanceof HTMLSelectElement)) {
      throw new Error('expected the serialized view to parse as a select')
    }
    if (!(fresh instanceof HTMLSelectElement)) {
      throw new Error('expected the client view to create a select')
    }

    expect(served.localName).toBe('select')
    expect(served.value).toBe('b')
    expect(served.selectedIndex).toBe(1)
    expect(fresh.localName).toBe(served.localName)
    expect(fresh.value).toBe(served.value)
    expect(fresh.selectedIndex).toBe(served.selectedIndex)
  })

  // Verified against Chromium: each serialized form below parses to exactly
  // what assigning the same value to `select.value` produces on the client.
  it('gives the select value ownership over a descendant Selected', () => {
    // The DOM value setter takes the first matching option and leaves every
    // other one unselected. Emitting both selected attributes let a browser
    // give the later option ownership (value "b", index 1) while a fresh client
    // render reasserted the select's value and chose the earlier one.
    const html = serializeHtml(
      h.select(
        [h.Value('a')],
        [
          h.option([h.Value('a')], ['A']),
          h.option([h.Value('b'), h.Selected(true)], ['B']),
        ],
      ),
    )

    expect(html).toBe(
      '<select><option value="a" selected="">A</option>' +
        '<option value="b">B</option></select>',
    )
  })

  it('lets an option own its selection when the select is uncontrolled', () => {
    const html = serializeHtml(
      h.select(
        [],
        [
          h.option([h.Value('a')], ['A']),
          h.option([h.Value('b'), h.Selected(true)], ['B']),
        ],
      ),
    )

    expect(html).toContain('<option value="b" selected="">B</option>')
  })

  it('refuses a single-line select whose value matches no option', () => {
    // HTML gives the first option the selection when none carries `selected`,
    // while the client sets `value` and lands on no selection at all.
    expect(() =>
      serializeHtml(
        h.select([h.Value('zzz')], [h.option([h.Value('a')], ['A'])]),
      ),
    ).toThrow(/no option carries it/)
  })

  it('allows no selection where the element can render that way', () => {
    // A multiple select, and one showing more than one row, can hold no
    // selection in source markup, which is what the client also produces.
    expect(
      serializeHtml(
        h.select(
          [h.Value('zzz'), h.Multiple(true)],
          [h.option([h.Value('a')], ['A'])],
        ),
      ),
    ).toBe('<select multiple=""><option value="a">A</option></select>')

    expect(
      serializeHtml(
        h.select(
          [h.Value('zzz'), h.Size(2)],
          [h.option([h.Value('a')], ['A'])],
        ),
      ),
    ).toContain('<option value="a">A</option>')
  })

  it('computes an option value with the platform whitespace rules', () => {
    // `String.prototype.trim` also strips a non-breaking space, which the
    // option-value algorithm keeps, so the select matched the wrong option.
    const label = '\u00a0A\u00a0'
    const html = serializeHtml(
      h.select([h.Value(label)], [h.option([], [label])]),
    )

    expect(html).toContain(`<option selected="">${label}</option>`)
  })

  it('still collapses ASCII whitespace in an option label', () => {
    const html = serializeHtml(
      h.select(
        [h.Value('United States')],
        [h.option([], ['  United\n  States  '])],
      ),
    )

    expect(html).toContain('selected=""')
  })

  it('takes the first of two options sharing a value', () => {
    const html = serializeHtml(
      h.select(
        [h.Value('a')],
        [h.option([h.Value('a')], ['1']), h.option([h.Value('a')], ['2'])],
      ),
    )

    expect(html).toBe(
      '<select><option value="a" selected="">1</option>' +
        '<option value="a">2</option></select>',
    )
  })

  it('refuses an option whose value hides inside trusted raw HTML', () => {
    // The option's value would come from text this render cannot see, so the
    // select could select the wrong option or none at all.
    expect(() =>
      serializeHtml(
        h.select([h.Value('a')], [h.option([h.InnerHTML('<b>a</b>')])]),
      ),
    ).toThrow(/h.InnerHTML and no value/)
  })

  it('accepts raw option markup when the value is explicit', () => {
    const html = serializeHtml(
      h.select(
        [h.Value('a')],
        [h.option([h.Value('a'), h.InnerHTML('<b>A</b>')])],
      ),
    )

    expect(html).toContain('<option value="a" selected=""><b>A</b></option>')
  })
})

describe('typed properties over raw attributes', () => {
  // A raw attribute and a typed builder naming the same attribute are two
  // owners of one piece of state. The serializer used to let the property win,
  // which fixed the element's current state and left its default disagreeing:
  // a served `<input>` with the attribute dropped has `defaultChecked` false
  // while a fresh render parses `checked` and has it true, so `form.reset()`,
  // `:default`, and `[checked]` read the two pages differently. There is no
  // served spelling for the pair, so it is refused where it is written.
  it('refuses a raw attribute a typed property also claims', () => {
    expect(() =>
      h.input([h.Attribute('checked', ''), h.Checked(false)]),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.input([h.Attribute('disabled', ''), h.Disabled(false)]),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.details([h.Attribute('open', ''), h.Open(false)], ['x']),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.option([h.Attribute('selected', ''), h.Selected(false)], ['A']),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.input([h.Attribute('value', 'server'), h.Value('')]),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.input([h.Attribute('checked', ''), h.Checked(true)]),
    ).toThrow(/two owners of one attribute/)
  })

  it('refuses the raw attribute under any ASCII casing', () => {
    // A parser and `setAttribute` both lowercase an HTML attribute name, so
    // `MULTIPLE` and `multiple` name one attribute. Comparing the literal
    // spelling read the first as an unrelated one and let the pair through.
    expect(() =>
      h.select([h.Attribute('MULTIPLE', ''), h.Multiple(false)]),
    ).toThrow(/two owners of one attribute/)
    expect(() =>
      h.input([h.Attribute('VALUE', 'server'), h.Value('')]),
    ).toThrow(/two owners of one attribute/)
  })

  it('uses the last ASCII-case alias when reading an HTML attribute', () => {
    expect(() =>
      h.input([
        h.Attribute('type', 'text'),
        h.Attribute('TYPE', 'file'),
        h.Value('secret'),
      ]),
    ).toThrow(/<input type="file"> was given a value/)
  })

  it('keeps a typed property client-only on an element that does not reflect it', () => {
    expect(
      serializeHtml(
        h.div([
          h.Href('/target'),
          h.Disabled(true),
          h.Value('state'),
          h.Checked(true),
        ]),
      ),
    ).toBe('<div></div>')
  })

  it('canonicalizes string values assigned to numeric IDL attributes', () => {
    expect(serializeHtml(h.meter([h.Value('1e-3')]))).toBe(
      '<meter value="0.001"></meter>',
    )
    expect(serializeHtml(h.meter([h.Value('01')]))).toBe(
      '<meter value="1"></meter>',
    )
    expect(serializeHtml(h.meter([h.Value('-0')]))).toBe(
      '<meter value="0"></meter>',
    )
    expect(serializeHtml(h.li([h.Value('007')]))).toBe('<li value="7"></li>')
  })

  it('reads a raw option value when matching the select value', () => {
    // The browser reflects a raw `value` attribute into the property, so an
    // analysis reading only `data.props` matched the option's text instead and
    // selected the wrong one.
    expect(
      serializeHtml(
        h.select(
          [h.Value('actual')],
          [h.option([h.Attribute('value', 'actual')], ['label'])],
        ),
      ),
    ).toBe('<select><option value="actual" selected="">label</option></select>')
  })

  it('reads raw multiple and size when deciding whether nothing may be selected', () => {
    expect(
      serializeHtml(
        h.select(
          [h.Value('zzz'), h.Attribute('multiple', '')],
          [h.option([h.Value('a')], ['A'])],
        ),
      ),
    ).toContain('<option value="a">A</option>')
    expect(
      serializeHtml(
        h.select(
          [h.Value('zzz'), h.Attribute('size', '4')],
          [h.option([h.Value('a')], ['A'])],
        ),
      ),
    ).toContain('<option value="a">A</option>')
  })

  it('allows a controlled value on a select with no options', () => {
    // A served empty select and a freshly built one both hold no selection, so
    // there is nothing for the two to disagree about.
    expect(serializeHtml(h.select([h.Value('zzz')]))).toBe('<select></select>')
  })

  it('still refuses a single-line select that lists options', () => {
    expect(() =>
      serializeHtml(
        h.select(
          [h.Value('zzz'), h.Attribute('size', '1')],
          [h.option([h.Value('a')], ['A'])],
        ),
      ),
    ).toThrow(/no option carries it/)
  })
})

describe('numeric builder ranges', () => {
  // Measured in Chromium: within the accepted range a parsed attribute and a
  // direct property assignment produce the same value; outside it they diverge
  // or the assignment throws. Refusing at the builder is what keeps the served
  // page and the client from disagreeing about a field's own limits.
  it('refuses a fractional, NaN, or infinite value', () => {
    for (const value of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => h.input([h.Maxlength(value)]), String(value)).toThrow(
        /maxLength was given/,
      )
    }
  })

  it('refuses a negative length, which throws on assignment', () => {
    expect(() => h.input([h.Maxlength(-1)])).toThrow(/maxLength was given/)
    expect(() => h.input([h.Minlength(-1)])).toThrow(/minLength was given/)
  })

  it('refuses a size of zero, which throws on an input', () => {
    expect(() => h.input([h.Size(0)])).toThrow(/size was given/)
  })

  it('accepts a size of zero where assignment and parsing agree', () => {
    expect(serializeHtml(h.select([h.Size(0)]))).toBe(
      '<select size="0"></select>',
    )
    expect(serializeHtml(h.hr([h.Size(0)]))).toBe('<hr size="0">')
  })

  it('refuses values past the signed long maximum', () => {
    for (const value of [2147483648, 4294967295, 4294967296]) {
      expect(() => h.td([h.Rowspan(value)]), String(value)).toThrow(
        /rowSpan was given/,
      )
      expect(() => h.col([h.Span(value)]), String(value)).toThrow(
        /span was given/,
      )
      expect(() => h.ol([h.Start(value)]), String(value)).toThrow(
        /start was given/,
      )
    }
  })

  it('accepts an ordered list starting at a negative number', () => {
    expect(serializeHtml(h.ol([h.Start(-5)]))).toBe('<ol start="-5"></ol>')
  })

  it('accepts ordinary values', () => {
    expect(serializeHtml(h.input([h.Maxlength(10), h.Size(4)]))).toBe(
      '<input maxlength="10" size="4">',
    )
    expect(serializeHtml(h.td([h.Colspan(2), h.Rowspan(3)]))).toBe(
      '<td colspan="2" rowspan="3"></td>',
    )
  })

  it('serializes normalized numeric defaults and legacy reflecting elements', () => {
    expect(serializeHtml(h.textarea([h.Cols(0), h.Rows(0)]))).toBe(
      '<textarea cols="20" rows="2"></textarea>',
    )
    expect(serializeHtml(h.hr([h.Size(4)]))).toBe('<hr size="4">')
    expect(serializeHtml(h.ul([h.Type('square')]))).toBe(
      '<ul type="square"></ul>',
    )
  })
})
