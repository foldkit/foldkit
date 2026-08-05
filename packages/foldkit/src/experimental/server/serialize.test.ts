import { Context, Schema as S } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from '../../html/boundary.js'
import { type Html, __htmlBuilder } from '../../html/index.js'
import { clearRuntime, setRuntime } from '../../html/runtimeSingleton.js'
import { m } from '../../message/index.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { serializeHtml } from './serialize.js'

const ClickedButton = m('ClickedButton')
const Message = S.Union([ClickedButton])
type Message = typeof Message.Type

const h = __htmlBuilder<Message>()

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
    const style = h.style([], ['</style><script>evil()</script>'])
    expect(() => serializeHtml(style)).toThrow('</style')
  })

  it('allows a closing-tag prefix that continues into a longer name', () => {
    const script = h.script([], ['const tag = "</scripting"'])
    expect(serializeHtml(script)).toBe(
      '<script>const tag = "</scripting"</script>',
    )
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

  it('omits a redundant empty value attribute on an input', () => {
    const view = h.input([h.Type('text'), h.Value('')])
    expect(serializeHtml(view)).toBe('<input type="text">')
  })

  it('omits end tags for void elements', () => {
    const view = h.div([], [h.br([]), h.img([h.Src('/cat.png'), h.Alt('cat')])])
    expect(serializeHtml(view)).toBe(
      '<div><br><img src="/cat.png" alt="cat"></div>',
    )
  })

  it('drops event handlers, keys, and mount markers from markup', () => {
    const view = h.keyed('button')(
      'submit',
      [h.OnClick(ClickedButton()), h.Id('submit')],
      ['Send'],
    )
    expect(serializeHtml(view)).toBe('<button id="submit">Send</button>')
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
