import { Effect, Schema as S } from 'effect'
import * as CustomElement from 'foldkit/customElement'
import { Server } from 'foldkit/experimental'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  BOOLEAN_PROPERTIES,
  PASSTHROUGH_PROPERTIES,
  RENAMED_PROPERTY_ATTRIBUTES,
  isHtmlPropertyRepresentable,
  reflectedAttributeName,
} from '../packages/foldkit/src/domReflection.js'

// The state a served element is in, compared against the state the client puts
// the same element in.
//
// Foldkit describes an element twice. Server rendering turns the view's typed
// properties and raw attributes into markup a parser reads back, and the client
// sets the attributes and then assigns the properties to a live element. The two
// are different mechanisms, and a browser does not read them the same way
// everywhere: `meter.value = '0x10'` is 16 while `value="0x10"` is invalid,
// `tabIndex = 2147483648` wraps to a negative while the attribute falls back to
// the element's default, and a file input throws on any value at all.
//
// This gate runs both sides in Chromium for every property-backed numeric
// builder and every element where a string builder reaches a numeric IDL
// attribute, and requires them to agree. It also requires the builders to refuse
// the views where they cannot: a view that has no served spelling must fail
// where it is written rather than diverge once deployed.

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

class ParityError extends Error {}

const log = (message: string): void => {
  console.log(`[dom-state-parity] ${message}`)
}

const fail = (message: string): never => {
  throw new ParityError(message)
}

// THE CASES

type Refusal = Readonly<{
  name: string
  build: (h: HtmlBuilder<never>) => Html
  expected: RegExp
}>

const SIGNED_LONG_MAXIMUM = 2147483647

// Every numeric builder, at the values a browser reads differently from markup
// and from an assignment. The ranges these check were measured in Chromium; the
// parity cases below re-measure the values inside them.
const NUMERIC_REFUSALS: ReadonlyArray<Refusal> = [
  {
    name: 'h.Tabindex past the signed long range',
    build: h => h.div([h.Tabindex(SIGNED_LONG_MAXIMUM + 1)]),
    expected: /tabIndex was given/,
  },
  {
    name: 'h.Tabindex given NaN',
    build: h => h.div([h.Tabindex(Number.NaN)]),
    expected: /tabIndex was given/,
  },
  {
    name: 'h.Tabindex given a fraction',
    build: h => h.div([h.Tabindex(1.5)]),
    expected: /tabIndex was given/,
  },
  {
    name: 'h.Maxlength given a negative',
    build: h => h.input([h.Maxlength(-1)]),
    expected: /maxLength was given/,
  },
  {
    name: 'h.Minlength given a negative',
    build: h => h.input([h.Minlength(-1)]),
    expected: /minLength was given/,
  },
  {
    name: 'h.Size given zero',
    build: h => h.input([h.Size(0)]),
    expected: /size was given/,
  },
  {
    name: 'h.Cols given Infinity',
    build: h => h.textarea([h.Cols(Number.POSITIVE_INFINITY)]),
    expected: /cols was given/,
  },
  {
    name: 'h.Rows given a fraction',
    build: h => h.textarea([h.Rows(2.5)]),
    expected: /rows was given/,
  },
  {
    name: 'h.Colspan given a negative',
    build: h => h.td([h.Colspan(-1)]),
    expected: /colSpan was given/,
  },
  {
    name: 'h.Rowspan given NaN',
    build: h => h.td([h.Rowspan(Number.NaN)]),
    expected: /rowSpan was given/,
  },
  {
    name: 'h.Span past the signed long range',
    build: h => h.col([h.Span(SIGNED_LONG_MAXIMUM + 1)]),
    expected: /span was given/,
  },
  {
    name: 'h.Start given a fraction',
    build: h => h.ol([h.Start(1.5)]),
    expected: /start was given/,
  },
  {
    name: 'h.High given NaN',
    build: h => h.meter([h.High(Number.NaN)]),
    expected: /high was given/,
  },
  {
    name: 'h.Low given Infinity',
    build: h => h.meter([h.Low(Number.POSITIVE_INFINITY)]),
    expected: /low was given/,
  },
  {
    name: 'h.Optimum given -Infinity',
    build: h => h.meter([h.Optimum(Number.NEGATIVE_INFINITY)]),
    expected: /optimum was given/,
  },
]

// A string builder that lands on a numeric IDL attribute. `h.Value`, `h.Max`,
// and `h.Min` are strings everywhere else, so the element decides.
const STRING_TO_NUMBER_REFUSALS: ReadonlyArray<Refusal> = [
  {
    name: 'a hexadecimal meter value',
    build: h => h.meter([h.Value('0x10')]),
    expected: /<meter> reads value as a number/,
  },
  {
    name: 'a meter value with surrounding whitespace',
    build: h => h.meter([h.Value(' 1 ')]),
    expected: /<meter> reads value as a number/,
  },
  {
    name: 'a signed meter value',
    build: h => h.meter([h.Value('+1')]),
    expected: /<meter> reads value as a number/,
  },
  {
    name: 'an unreadable meter value',
    build: h => h.meter([h.Value('abc')]),
    expected: /<meter> reads value as a number/,
  },
  {
    name: 'an empty meter max',
    build: h => h.meter([h.Max('')]),
    expected: /<meter> reads max as a number/,
  },
  {
    name: 'an infinite meter min',
    build: h => h.meter([h.Min('Infinity')]),
    expected: /<meter> reads min as a number/,
  },
  {
    name: 'a hexadecimal progress value',
    build: h => h.progress([h.Value('0x10')]),
    expected: /<progress> reads value as a number/,
  },
  {
    name: 'a hexadecimal progress max',
    build: h => h.progress([h.Max('0x10')]),
    expected: /<progress> reads max as a number/,
  },
  {
    name: 'a hexadecimal list item value',
    build: h => h.li([h.Value('0x10')]),
    expected: /<li> reads value as an integer/,
  },
  {
    name: 'an exponent list item value',
    build: h => h.li([h.Value('1e3')]),
    expected: /<li> reads value as an integer/,
  },
  {
    name: 'a fractional list item value',
    build: h => h.li([h.Value('1.5')]),
    expected: /<li> reads value as an integer/,
  },
]

// Select property states with no equivalent source markup. Foldkit applies a
// client-only value property before options exist in a fresh render and after
// they exist during hydration. A controlled value naming no option disagrees
// with a single-line element, where HTML selects the first option. Whether an
// element permits no selection is decided by `multiple` and by `size` as a
// browser parses it, not as `parseInt` reads it.
const SELECT_REFUSALS: ReadonlyArray<Refusal> = [
  {
    name: 'a native select with a client-only value property',
    build: h => {
      const selectLike = CustomElement.define({
        tag: 'x-select-like',
        properties: { value: S.Unknown },
        events: {},
      }).withMessage(h)
      return h.select(
        [selectLike.Value('b')],
        [h.option([h.Value('a')], ['A']), h.option([h.Value('b')], ['B'])],
      )
    },
    expected: /client-only value property/,
  },
  {
    name: 'a single-line select whose value names no option',
    build: h => h.select([h.Value('zzz')], [h.option([h.Value('a')], ['A'])]),
    expected: /no option carries it/,
  },
  {
    name: 'a select sized one row',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('size', '1')],
        [h.option([h.Value('a')], ['A'])],
      ),
    expected: /no option carries it/,
  },
  {
    name: 'a select sized past the unsigned long range',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('size', '4294967296')],
        [h.option([h.Value('a')], ['A'])],
      ),
    expected: /no option carries it/,
  },
  {
    name: 'a select sized by a hexadecimal literal',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('size', '0x4')],
        [h.option([h.Value('a')], ['A'])],
      ),
    expected: /no option carries it/,
  },
]

const OTHER_REFUSALS: ReadonlyArray<Refusal> = [
  {
    name: 'a controlled value on a file input',
    build: h => h.input([h.Type('file'), h.Value('nonempty')]),
    expected: /<input type="file"> was given a value/,
  },
  {
    name: 'a controlled value on a file input typed by a raw attribute',
    build: h => h.input([h.Attribute('type', 'file'), h.Value('nonempty')]),
    expected: /<input type="file"> was given a value/,
  },
  {
    name: 'a typed href on an SVG link',
    build: h => h.svg([], [h.a([h.Href('/target')], ['go'])]),
    expected: /SVG or MathML namespace, where href is not a property/,
  },
  {
    name: 'a typed title on an SVG shape',
    build: h => h.svg([], [h.rect([h.Title('shape')])]),
    expected: /SVG or MathML namespace, where title is not a property/,
  },
  {
    name: 'a typed href nested inside an SVG group',
    build: h => h.svg([], [h.g([], [h.a([h.Href('/target')], ['go'])])]),
    expected: /SVG or MathML namespace, where href is not a property/,
  },
  {
    name: 'a typed disabled inside MathML',
    build: h => h.math([], [h.mtext([h.Disabled(true)], ['x'])]),
    expected: /does not reflect an attribute|SVG or MathML namespace/,
  },
  {
    name: 'a raw attribute a typed property also claims',
    build: h => h.input([h.Attribute('checked', ''), h.Checked(false)]),
    expected: /two owners of one attribute/,
  },
  {
    name: 'a raw attribute under a different ASCII casing',
    build: h => h.select([h.Attribute('MULTIPLE', ''), h.Multiple(false)]),
    expected: /two owners of one attribute/,
  },
  {
    name: 'a file input selected by the last raw type alias',
    build: h =>
      h.input([
        h.Attribute('type', 'text'),
        h.Attribute('TYPE', 'file'),
        h.Value('secret'),
      ]),
    expected: /<input type="file"> was given a value/,
  },
  {
    name: 'a style value carrying a second declaration',
    build: h => h.div([h.Style({ color: 'red; position: fixed' })]),
    expected: /h\.Style/,
  },
  {
    name: 'a style value carrying an important declaration',
    build: h => h.div([h.Style({ color: 'red !important' })]),
    expected: /h\.Style/,
  },
  {
    name: 'a style key carrying a declaration delimiter',
    build: h => h.div([h.Style({ 'color;position': 'fixed' })]),
    expected: /h\.Style/,
  },
]

const REFUSALS: ReadonlyArray<Refusal> = [
  ...NUMERIC_REFUSALS,
  ...STRING_TO_NUMBER_REFUSALS,
  ...OTHER_REFUSALS,
]

// Serialization refusals, which need a render rather than a builder call.
const SERIALIZE_REFUSALS: ReadonlyArray<Refusal> = SELECT_REFUSALS

// The ancestors an element needs before HTML parsing will leave it where the
// view put it. A bare `<td>` in a `<div>` is foster-parented out; a `<col>`
// needs a `<colgroup>`.
type Container = 'Block' | 'TableRow' | 'ColumnGroup' | 'List' | 'Svg'

type ParityCase = Readonly<{
  name: string
  build: (h: HtmlBuilder<never>) => Html
  // The element the probes read, relative to the rendered root.
  selector: string
  // The DOM properties both sides must agree on. `defaultValue` and
  // `defaultChecked` belong here only where the view writes the attribute: a
  // typed property alone controls the current state, and the default it leaves
  // behind is the served attribute's until hydration removes it.
  properties: ReadonlyArray<string>
  // The attribute text both sides must agree on.
  attributes?: ReadonlyArray<string>
  container?: Container
}>

// Values inside the accepted ranges, on every element whose property the
// builders write as a number, plus the form state a served page carries before
// any client code runs.
const PARITY_CASES: ReadonlyArray<ParityCase> = [
  {
    name: 'tabindex on a div',
    build: h => h.div([h.Tabindex(3)], ['x']),
    selector: 'div',
    properties: ['tabIndex'],
    attributes: ['tabindex'],
  },
  {
    name: 'a negative tabindex on a div',
    build: h => h.div([h.Tabindex(-1)], ['x']),
    selector: 'div',
    properties: ['tabIndex'],
    attributes: ['tabindex'],
  },
  {
    name: 'tabindex at the bottom of the signed long range',
    build: h => h.div([h.Tabindex(-2147483648)], ['x']),
    selector: 'div',
    properties: ['tabIndex'],
    attributes: ['tabindex'],
  },
  {
    name: 'tabindex at the top of the signed long range',
    build: h => h.div([h.Tabindex(SIGNED_LONG_MAXIMUM)], ['x']),
    selector: 'div',
    properties: ['tabIndex'],
    attributes: ['tabindex'],
  },
  {
    name: 'maxlength and minlength on an input',
    build: h => h.input([h.Maxlength(10), h.Minlength(0)]),
    selector: 'input',
    properties: ['maxLength', 'minLength'],
    attributes: ['maxlength', 'minlength'],
  },
  {
    name: 'size on an input',
    build: h => h.input([h.Size(1)]),
    selector: 'input',
    properties: ['size'],
    attributes: ['size'],
  },
  {
    name: 'size on a select',
    build: h => h.select([h.Size(4)], [h.option([h.Value('a')], ['A'])]),
    selector: 'select',
    properties: ['size', 'multiple'],
    attributes: ['size'],
  },
  {
    name: 'zero size on a select',
    build: h => h.select([h.Size(0)], [h.option([h.Value('a')], ['A'])]),
    selector: 'select',
    properties: ['size', 'multiple'],
    attributes: ['size'],
  },
  {
    name: 'zero size on a horizontal rule',
    build: h => h.hr([h.Size(0)]),
    selector: 'hr',
    properties: ['size'],
    attributes: ['size'],
  },
  {
    name: 'cols and rows on a textarea',
    build: h => h.textarea([h.Cols(20), h.Rows(3)]),
    selector: 'textarea',
    properties: ['cols', 'rows'],
    attributes: ['cols', 'rows'],
  },
  {
    name: 'colspan and rowspan on a cell',
    build: h => h.td([h.Colspan(2), h.Rowspan(3)], ['x']),
    selector: 'td',
    properties: ['colSpan', 'rowSpan'],
    attributes: ['colspan', 'rowspan'],
    container: 'TableRow',
  },
  {
    name: 'span on a column',
    build: h => h.col([h.Span(2)]),
    selector: 'col',
    properties: ['span'],
    attributes: ['span'],
    container: 'ColumnGroup',
  },
  {
    name: 'start on an ordered list',
    build: h => h.ol([h.Start(-5)], [h.li([], ['a'])]),
    selector: 'ol',
    properties: ['start'],
    attributes: ['start'],
  },
  {
    name: 'high, low and optimum on a meter',
    build: h => h.meter([h.High(0.8), h.Low(0.2), h.Optimum(0.5)], ['x']),
    selector: 'meter',
    properties: ['high', 'low', 'optimum', 'max', 'min', 'value'],
  },
  {
    name: 'a decimal meter value',
    build: h => h.meter([h.Value('0.25')], ['x']),
    selector: 'meter',
    properties: ['value', 'max', 'min'],
  },
  {
    name: 'an exponent meter value',
    build: h => h.meter([h.Value('1e-3')], ['x']),
    selector: 'meter',
    properties: ['value'],
    attributes: ['value'],
  },
  {
    name: 'a leading-zero meter value',
    build: h => h.meter([h.Value('01')], ['x']),
    selector: 'meter',
    properties: ['value'],
    attributes: ['value'],
  },
  {
    name: 'a negative-zero meter value',
    build: h => h.meter([h.Value('-0')], ['x']),
    selector: 'meter',
    properties: ['value'],
    attributes: ['value'],
  },
  {
    name: 'a negative meter min',
    build: h => h.meter([h.Min('-2'), h.Value('-1')], ['x']),
    selector: 'meter',
    properties: ['value', 'min'],
  },
  {
    name: 'a decimal progress value',
    build: h => h.progress([h.Value('0.5'), h.Max('2')], ['x']),
    selector: 'progress',
    properties: ['value', 'max', 'position'],
  },
  {
    name: 'an integer list item value',
    build: h => h.li([h.Value('7')], ['a']),
    selector: 'li',
    properties: ['value'],
    attributes: ['value'],
    container: 'List',
  },
  {
    name: 'a leading-zero list item value',
    build: h => h.li([h.Value('007')], ['a']),
    selector: 'li',
    properties: ['value'],
    attributes: ['value'],
    container: 'List',
  },
  {
    name: 'a negative list item value',
    build: h => h.li([h.Value('-7')], ['a']),
    selector: 'li',
    properties: ['value'],
    container: 'List',
  },
  {
    name: 'an empty value on a file input',
    build: h => h.input([h.Type('file'), h.Value('')]),
    selector: 'input',
    properties: ['type', 'value'],
  },
  {
    name: 'a checked box',
    build: h => h.input([h.Type('checkbox'), h.Checked(true)]),
    selector: 'input',
    properties: ['type', 'checked'],
  },
  {
    name: 'an unchecked box',
    build: h => h.input([h.Type('checkbox'), h.Checked(false)]),
    selector: 'input',
    properties: ['type', 'checked', 'defaultChecked'],
    attributes: ['checked'],
  },
  {
    name: 'a controlled text input',
    build: h => h.input([h.Type('text'), h.Value('written')]),
    selector: 'input',
    properties: ['type', 'value'],
  },
  {
    name: 'a raw checked attribute with no typed property',
    build: h => h.input([h.Type('checkbox'), h.Attribute('checked', '')]),
    selector: 'input',
    properties: ['checked', 'defaultChecked'],
    attributes: ['checked'],
  },
  {
    name: 'a raw value attribute with no typed property',
    build: h => h.input([h.Type('text'), h.Attribute('value', 'server')]),
    selector: 'input',
    properties: ['value', 'defaultValue'],
    attributes: ['value'],
  },
  {
    name: 'a multiple select whose value names no option',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Multiple(true)],
        [h.option([h.Value('a')], ['A'])],
      ),
    selector: 'select',
    properties: ['value', 'selectedIndex', 'multiple'],
  },
  {
    name: 'a raw multiple select whose value names no option',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('multiple', '')],
        [h.option([h.Value('a')], ['A'])],
      ),
    selector: 'select',
    properties: ['value', 'selectedIndex', 'multiple'],
    attributes: ['multiple'],
  },
  {
    name: 'a raw uppercase multiple select whose value names no option',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('MULTIPLE', '')],
        [h.option([h.Value('a')], ['A'])],
      ),
    selector: 'select',
    properties: ['value', 'selectedIndex', 'multiple'],
  },
  {
    name: 'a raw in-range size select whose value names no option',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('size', '4294967295')],
        [h.option([h.Value('a')], ['A'])],
      ),
    selector: 'select',
    properties: ['value', 'selectedIndex'],
    attributes: ['size'],
  },
  {
    name: 'a raw size select a browser reads as four rows',
    build: h =>
      h.select(
        [h.Value('zzz'), h.Attribute('size', ' 4 ')],
        [h.option([h.Value('a')], ['A'])],
      ),
    selector: 'select',
    properties: ['value', 'selectedIndex'],
    attributes: ['size'],
  },
  {
    name: 'an SVG link written as a raw attribute',
    build: h => h.a([h.Attribute('href', '/target')], ['go']),
    selector: 'a',
    properties: ['tabIndex'],
    attributes: ['href'],
    container: 'Svg',
  },
  {
    name: 'an SVG shape carrying an id and a tabindex',
    build: h => h.rect([h.Id('shape'), h.Tabindex(0)]),
    selector: 'rect',
    properties: ['id', 'tabIndex'],
    attributes: ['id', 'tabindex'],
    container: 'Svg',
  },
  {
    name: 'uppercase raw attributes on an HTML element',
    build: h => h.div([h.Attribute('DATA-X', 'same')], ['x']),
    selector: 'div',
    properties: [],
    attributes: ['data-x'],
  },
  {
    name: 'a data URL with a semicolon in one style value',
    build: h =>
      h.div([
        h.Style({
          backgroundImage:
            'url(data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E)',
        }),
      ]),
    selector: 'div',
    properties: [],
  },
  {
    name: 'CSSStyleDeclaration alias and vendor style properties',
    build: h =>
      h.div([
        h.Style({
          cssFloat: 'left',
          textAlign: 'center',
          WebkitLineClamp: '2',
        }),
      ]),
    selector: 'div',
    properties: [],
  },
  {
    name: 'dashed and lowercase vendor style properties',
    build: h =>
      h.div([
        h.Style({
          'background-color': 'rgb(1, 2, 3)',
          webkitLineClamp: '3',
        }),
      ]),
    selector: 'div',
    properties: [],
  },
  {
    name: 'a Unicode custom style property',
    build: h => h.div([h.Style({ '--café': 'crème' })]),
    selector: 'div',
    properties: [],
  },
  {
    name: 'an invalid CSS value ignored by CSSOM',
    build: h => h.div([h.Style({ color: 'not-a-color' })]),
    selector: 'div',
    properties: [],
  },
]

const REFLECTION_TAGS: ReadonlyArray<string> = [
  'a',
  'area',
  'audio',
  'base',
  'blockquote',
  'button',
  'col',
  'colgroup',
  'data',
  'del',
  'details',
  'dialog',
  'div',
  'embed',
  'fieldset',
  'form',
  'hr',
  'iframe',
  'img',
  'input',
  'ins',
  'label',
  'li',
  'link',
  'map',
  'meta',
  'meter',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'param',
  'progress',
  'q',
  'script',
  'select',
  'slot',
  'source',
  'style',
  'td',
  'textarea',
  'th',
  'time',
  'track',
  'video',
  'x-card',
]

const REFLECTION_PROPERTIES: ReadonlyArray<string> = Array.from(
  new Set([
    ...BOOLEAN_PROPERTIES,
    ...PASSTHROUGH_PROPERTIES,
    ...Object.keys(RENAMED_PROPERTY_ATTRIBUTES),
    'draggable',
  ]),
)

const NON_REFLECTING_ASSIGNMENTS: ReadonlySet<string> = new Set([
  'audio.muted',
  'input.checked',
  'input.value',
  'option.selected',
  'output.value',
  'select.value',
  'textarea.value',
  'video.muted',
])

const NUMERIC_ASSIGNMENTS: ReadonlySet<string> = new Set([
  'cols',
  'colSpan',
  'high',
  'low',
  'max',
  'maxLength',
  'min',
  'minLength',
  'optimum',
  'rows',
  'rowSpan',
  'size',
  'span',
  'start',
  'tabIndex',
  'value',
])

type ReflectionExpectation = Readonly<{
  tagName: string
  propertyName: string
  attributeName: string
  isRepresentable: boolean
  isReflecting: boolean
  value: string | number | boolean
}>

const REFLECTION_MATRIX: ReadonlyArray<ReflectionExpectation> =
  REFLECTION_TAGS.flatMap(tagName =>
    REFLECTION_PROPERTIES.map(propertyName => ({
      tagName,
      propertyName,
      attributeName: reflectedAttributeName(propertyName) ?? propertyName,
      isRepresentable: isHtmlPropertyRepresentable(tagName, propertyName),
      isReflecting: !NON_REFLECTING_ASSIGNMENTS.has(
        `${tagName}.${propertyName}`,
      ),
      value: BOOLEAN_PROPERTIES.has(propertyName)
        ? true
        : NUMERIC_ASSIGNMENTS.has(propertyName)
          ? 2
          : 'foldkit',
    })),
  )

// RENDERING

type CapturedData = Readonly<{
  attrs?: Readonly<Record<string, string | number | boolean>>
  props?: Readonly<Record<string, unknown>>
  style?: Readonly<Record<string, unknown>>
}>

// The probed element sits inside a container, and for a `div` in a `div` the
// two are told apart by marking the container rather than by counting.
const PROBE_HOST = 'data-probe-host'

const containedBy = (
  h: HtmlBuilder<never>,
  container: Container,
  element: Html,
): Html => {
  switch (container) {
    case 'TableRow':
      return h.table(
        [h.Attribute(PROBE_HOST, '')],
        [h.tbody([], [h.tr([], [element])])],
      )
    case 'ColumnGroup':
      return h.table([h.Attribute(PROBE_HOST, '')], [h.colgroup([], [element])])
    case 'List':
      return h.ol([h.Attribute(PROBE_HOST, '')], [element])
    case 'Svg':
      return h.svg([h.Attribute(PROBE_HOST, '')], [element])
    case 'Block':
      return h.div([h.Attribute(PROBE_HOST, '')], [element])
  }
}

type RenderedCase = Readonly<{
  name: string
  selector: string
  properties: ReadonlyArray<string>
  probedAttributes: ReadonlyArray<string>
  html: string
  attributes: Readonly<Record<string, string>>
  values: Readonly<Record<string, unknown>>
  styles: Readonly<Record<string, unknown>>
  container: Container
}>

const renderCase = async (parityCase: ParityCase): Promise<RenderedCase> => {
  let captured: CapturedData = {}
  const rendered = await Effect.runPromise(
    Server.renderToString(
      {
        init: () => ({ model: null }),
        view: (_model: null, h: HtmlBuilder<never>) => {
          const element = parityCase.build(h)
          captured = element?.data ?? {}
          return {
            title: 'dom state parity',
            body: containedBy(h, parityCase.container ?? 'Block', element),
          }
        },
      },
      { isHydratable: false },
    ),
  )

  const attributes: Record<string, string> = {}
  for (const [name, value] of Object.entries(captured.attrs ?? {})) {
    if (value === true) {
      attributes[name] = ''
    } else if (value !== false) {
      attributes[name] = String(value)
    }
  }

  return {
    name: parityCase.name,
    selector: parityCase.selector,
    properties: parityCase.properties,
    probedAttributes: parityCase.attributes ?? [],
    html: rendered.html,
    attributes,
    values: captured.props ?? {},
    styles: captured.style ?? {},
    container: parityCase.container ?? 'Block',
  }
}

// THE BROWSER

type PlaywrightPage = Readonly<{
  setContent: (html: string) => Promise<unknown>
  evaluate: <A>(body: string) => Promise<A>
}>

type PlaywrightBrowser = Readonly<{
  newPage: () => Promise<PlaywrightPage>
  close: () => Promise<void>
}>

type PlaywrightBrowserType = Readonly<{
  launch: (
    options: Readonly<Record<string, never>>,
  ) => Promise<PlaywrightBrowser>
}>

// Playwright is installed for the browser suites in `packages/examples-e2e`
// rather than at the root, and it is CommonJS, so it is required from that
// package rather than imported from here.
const loadChromium = (): PlaywrightBrowserType => {
  const requireFromE2e = createRequire(
    join(REPO_ROOT, 'packages/examples-e2e/package.json'),
  )
  const playwright: Readonly<{ chromium: PlaywrightBrowserType }> =
    requireFromE2e('playwright')
  return playwright.chromium
}

// Reads the served element, then builds the same element the way the client
// does: snabbdom's attributes module writes the raw attributes, and the props
// module assigns the typed properties, in that order.
const COMPARE = `([servedHtml, selector, propertyNames, attributeNames, attributes, properties, styles, container]) => {
  const host = document.createElement('div')
  host.innerHTML = servedHtml
  const served = host.querySelector('[data-probe-host] ' + selector)

  const SVG = 'http://www.w3.org/2000/svg'
  const parentChain = {
    Block: ['div'],
    TableRow: ['table', 'tbody', 'tr'],
    ColumnGroup: ['table', 'colgroup'],
    List: ['ol'],
    Svg: ['svg'],
  }[container]
  const isForeign = container === 'Svg'
  const create = name =>
    isForeign
      ? document.createElementNS(SVG, name)
      : document.createElement(name)

  let outer = null
  let inner = null
  for (const name of parentChain) {
    const created = name === 'svg' ? document.createElementNS(SVG, name) : create(name)
    if (inner === null) { outer = created } else { inner.appendChild(created) }
    inner = created
  }
  const fresh = create(selector)
  inner.appendChild(fresh)
  document.body.appendChild(outer)

  let freshError = ''
  try {
    for (const name of Object.keys(attributes)) {
      fresh.setAttribute(name, attributes[name])
    }
    for (const name of Object.keys(properties)) {
      fresh[name] = properties[name]
    }
    for (const name of Object.keys(styles)) {
      fresh.style.setProperty(name, styles[name])
    }
  } catch (error) {
    freshError = error.name + ': ' + error.message
  }

  const read = element => {
    if (element === null) {
      return { missing: true }
    }
    const out = {}
    for (const name of propertyNames) {
      out['property ' + name] = String(element[name])
    }
    for (const name of attributeNames) {
      out['attribute ' + name] = String(element.getAttribute(name))
    }
    out['style cssText'] = element.style.cssText
    return out
  }

  return { served: read(served), fresh: read(fresh), freshError }
}`

const CHECK_REFLECTION_MATRIX = `(matrix => {
  const failures = []
  for (const entry of matrix) {
    const element = document.createElement(entry.tagName)
    let error = ''
    try {
      element[entry.propertyName] = entry.value
    } catch (cause) {
      error = cause.name + ': ' + cause.message
    }
    const hasAttribute = element.hasAttribute(entry.attributeName)
    if (entry.isRepresentable) {
      if (error !== '') {
        failures.push(entry.tagName + '.' + entry.propertyName + ' threw ' + error)
      } else if (entry.isReflecting && !hasAttribute) {
        failures.push(entry.tagName + '.' + entry.propertyName + ' did not reflect ' + entry.attributeName)
      }
    } else if (hasAttribute) {
      failures.push(entry.tagName + '.' + entry.propertyName + ' unexpectedly reflected ' + entry.attributeName)
    }
  }
  return failures
})`

const CHECK_STYLE_CONTRACT = `(() => {
  const host = document.createElement('div')
  host.innerHTML = '<div id="served" style="color: #ff0000"></div>'
  const served = host.querySelector('#served')
  const fresh = document.createElement('div')
  fresh.style.setProperty('color', '#ff0000')
  return {
    servedCssText: served.style.cssText,
    freshCssText: fresh.style.cssText,
    servedAuthored: served.getAttribute('style'),
    freshAuthored: fresh.getAttribute('style'),
    servedExactSelector: served.matches('[style="color: #ff0000"]'),
    freshExactSelector: fresh.matches('[style="color: #ff0000"]'),
  }
})()`

const CHECK_SCRIPT_INSERTION = `(() => {
  const host = document.createElement('div')
  host.innerHTML = '<script>window.__foldkitInnerHtmlScript = 1<\\/script>'
  document.body.appendChild(host)
  return {
    parsed: window.__foldkitParsedScript,
    innerHtml: window.__foldkitInnerHtmlScript,
  }
})()`

const CHECK_STYLE_CSP = `(() => {
  const cssom = document.createElement('div')
  document.body.appendChild(cssom)
  cssom.style.setProperty('color', 'rgb(1, 2, 3)')
  const attribute = document.createElement('div')
  document.body.appendChild(attribute)
  attribute.setAttribute('style', 'color: rgb(4, 5, 6)')
  return {
    cssom: getComputedStyle(cssom).color,
    attribute: getComputedStyle(attribute).color,
  }
})()`

type Reading = Readonly<Record<string, string | boolean>>

type Comparison = Readonly<{
  served: Reading
  fresh: Reading
  freshError: string
}>

type StyleContract = Readonly<{
  servedCssText: string
  freshCssText: string
  servedAuthored: string | null
  freshAuthored: string | null
  servedExactSelector: boolean
  freshExactSelector: boolean
}>

type ScriptInsertion = Readonly<{
  parsed: number | undefined
  innerHtml: number | undefined
}>

type StyleCsp = Readonly<{
  cssom: string
  attribute: string
}>

// THE RUN

const messageFor = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const runRefusals = (h: HtmlBuilder<never>): void => {
  for (const refusal of REFUSALS) {
    let message: string | undefined
    try {
      refusal.build(h)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    if (message === undefined) {
      fail(`${refusal.name}: built without refusing it`)
      return
    }
    if (!refusal.expected.test(message)) {
      fail(`${refusal.name}: refused with an unexpected message: ${message}`)
    }
  }
  log(`${String(REFUSALS.length)} unrepresentable views refused where written`)
}

// A select's own refusal needs the whole subtree, so it lands in the serializer
// rather than in a builder call.
const runSerializeRefusals = async (): Promise<void> => {
  for (const refusal of SERIALIZE_REFUSALS) {
    const outcome = await Effect.runPromise(
      Effect.result(
        Server.renderToString(
          {
            init: () => ({ model: null }),
            view: (_model: null, h: HtmlBuilder<never>) => ({
              title: 'dom state parity',
              body: h.div([], [refusal.build(h)]),
            }),
          },
          { isHydratable: false },
        ),
      ),
    )
    if (outcome._tag === 'Success') {
      fail(`${refusal.name}: rendered without refusing it`)
      return
    }
    const message = messageFor(outcome.failure.cause)
    if (!refusal.expected.test(message)) {
      fail(`${refusal.name}: refused with an unexpected message: ${message}`)
    }
  }
  log(
    `${String(SERIALIZE_REFUSALS.length)} unrepresentable views refused when rendered`,
  )
}

const main = async (): Promise<void> => {
  // The builders need a builder instance, which only a render hands out.
  let builder: HtmlBuilder<never> | undefined
  await Effect.runPromise(
    Server.renderToString(
      {
        init: () => ({ model: null }),
        view: (_model: null, h: HtmlBuilder<never>) => {
          builder = h
          return { title: 'dom state parity', body: h.div([], ['x']) }
        },
      },
      { isHydratable: false },
    ),
  )
  if (builder === undefined) {
    fail('the render never called the view')
    return
  }
  runRefusals(builder)
  await runSerializeRefusals()

  const rendered = await Promise.all(
    PARITY_CASES.map(async parityCase => {
      try {
        return await renderCase(parityCase)
      } catch (error) {
        return fail(
          `${parityCase.name}: rendering failed: ${messageFor(error)}`,
        )
      }
    }),
  )

  const browser = await loadChromium().launch({})
  const divergences: Array<string> = []
  try {
    const page = await browser.newPage()
    await page.setContent('<!doctype html><html><body></body></html>')
    const reflectionFailures = await page.evaluate<ReadonlyArray<string>>(
      `${CHECK_REFLECTION_MATRIX}(${JSON.stringify(REFLECTION_MATRIX)})`,
    )
    divergences.push(...reflectionFailures)
    const styleContract =
      await page.evaluate<StyleContract>(CHECK_STYLE_CONTRACT)
    if (styleContract.servedCssText !== styleContract.freshCssText) {
      divergences.push(
        'h.Style effective CSS differs between parsed server markup and CSSOM assignment',
      )
    }
    if (
      styleContract.servedAuthored === styleContract.freshAuthored ||
      !styleContract.servedExactSelector ||
      styleContract.freshExactSelector
    ) {
      divergences.push(
        'the style contract probe no longer distinguishes effective CSS from authored attribute text',
      )
    }
    for (const parityCase of rendered) {
      // Playwright evaluates a string as an expression rather than calling it
      // with arguments, so the case travels inside the expression.
      const comparison = await page.evaluate<Comparison>(
        `(${COMPARE})(${JSON.stringify([
          parityCase.html,
          parityCase.selector,
          parityCase.properties,
          parityCase.probedAttributes,
          parityCase.attributes,
          parityCase.values,
          parityCase.styles,
          parityCase.container,
        ])})`,
      )
      if (comparison.freshError !== '') {
        divergences.push(
          `${parityCase.name}: the client render threw ${comparison.freshError}`,
        )
        continue
      }
      if (comparison.served['missing'] === true) {
        divergences.push(
          `${parityCase.name}: the served HTML has no ${parityCase.selector}`,
        )
        continue
      }
      for (const key of Object.keys(comparison.served)) {
        const served = comparison.served[key]
        const fresh = comparison.fresh[key]
        if (served !== fresh) {
          divergences.push(
            `${parityCase.name}: ${key} is ${JSON.stringify(served)} when ` +
              `served and ${JSON.stringify(fresh)} when built fresh`,
          )
        }
      }
    }
    await page.setContent(
      '<!doctype html><html><body><script>window.__foldkitParsedScript = 1</script></body></html>',
    )
    const scriptInsertion = await page.evaluate<ScriptInsertion>(
      CHECK_SCRIPT_INSERTION,
    )
    if (
      scriptInsertion.parsed !== 1 ||
      scriptInsertion.innerHtml !== undefined
    ) {
      divergences.push(
        'the script insertion probe no longer observes parser execution and innerHTML inertness',
      )
    }
    await page.setContent(
      '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="style-src-attr \'none\'"></head><body></body></html>',
    )
    const styleCsp = await page.evaluate<StyleCsp>(CHECK_STYLE_CSP)
    if (styleCsp.cssom !== 'rgb(1, 2, 3)') {
      divergences.push(
        `CSSOM style assignment was blocked by style-src-attr: ${styleCsp.cssom}`,
      )
    }
    if (styleCsp.attribute === 'rgb(4, 5, 6)') {
      divergences.push(
        'setAttribute(style) unexpectedly bypassed style-src-attr in Chromium',
      )
    }
  } finally {
    await browser.close()
  }

  if (divergences.length > 0) {
    fail(
      `the served DOM and a fresh client DOM disagree:\n  ${divergences.join('\n  ')}`,
    )
  }
  log(`${String(REFLECTION_MATRIX.length)} HTML property reflections verified`)
  log(`${String(rendered.length)} views agree between server and client`)
  log('style, CSP, and script insertion contracts verified')
  log('PASS')
}

main().catch((error: unknown) => {
  console.error(`[dom-state-parity] FAIL ${messageFor(error)}`)
  process.exitCode = 1
})
