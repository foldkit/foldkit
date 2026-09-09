import { CSS_STYLE_PROPERTIES } from './cssStyleProperties.js'

// The one description of how a typed attribute builder's DOM property relates
// to the HTML attribute it is named after.
//
// Two mechanisms read this. A server render turns the property into attribute
// text a parser will read back, and a client render assigns the property to a
// live element. They agree only where the property is a reflecting IDL
// attribute of that element, so the same tables decide what the serializer
// emits and what the builders refuse to build. Keeping one copy is what stops
// the two from drifting: a property added to the serializer alone would be
// served as markup no client render reproduces.

/** DOM properties whose attribute is present or absent rather than valued.
 *
 * @internal */
export const BOOLEAN_PROPERTIES: ReadonlySet<string> = new Set([
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'disabled',
  'formNoValidate',
  'hidden',
  'inert',
  'isMap',
  'loop',
  'multiple',
  'muted',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'selected',
])

/** DOM properties whose name differs from the attribute they reflect.
 *
 * @internal */
export const RENAMED_PROPERTY_ATTRIBUTES: Readonly<Record<string, string>> = {
  colSpan: 'colspan',
  dateTime: 'datetime',
  formAction: 'formaction',
  formEnctype: 'formenctype',
  formMethod: 'formmethod',
  formNoValidate: 'formnovalidate',
  formTarget: 'formtarget',
  htmlFor: 'for',
  isMap: 'ismap',
  maxLength: 'maxlength',
  minLength: 'minlength',
  noValidate: 'novalidate',
  playsInline: 'playsinline',
  readOnly: 'readonly',
  rowSpan: 'rowspan',
  tabIndex: 'tabindex',
}

/** DOM properties whose value is written as the same-named attribute verbatim.
 *
 * @internal */
export const PASSTHROUGH_PROPERTIES: ReadonlySet<string> = new Set([
  'accept',
  'action',
  'alt',
  'autocomplete',
  'cite',
  'cols',
  'dir',
  'download',
  'enctype',
  'high',
  'href',
  'id',
  'label',
  'lang',
  'low',
  'max',
  'method',
  'min',
  'name',
  'optimum',
  'pattern',
  'placeholder',
  'poster',
  'preload',
  'rel',
  'rows',
  'size',
  'span',
  'src',
  'start',
  'step',
  'target',
  'title',
  'type',
  'value',
  'wrap',
])

/** The property names that are universal HTML global attributes.
 *
 * @internal */
export const GLOBAL_ATTRIBUTE_PROPERTIES: ReadonlySet<string> = new Set([
  'autofocus',
  'id',
  'title',
  'lang',
  'dir',
  'tabIndex',
  'hidden',
  'inert',
  'draggable',
])

// The properties an SVG or MathML element carries as reflecting IDL attributes,
// so that assigning one on the client leaves the element in the state parsing
// the served attribute produces.
//
// Everything else is an HTML interface member the foreign element does not
// have. Assigning `title` or `href` to an SVG element sets an expando or, since
// bundled code is strict, throws on a readonly `SVGAnimatedString`, while the
// serializer would have written an attribute; the two never agree. Measured in
// Chromium across the whole table above on `svg:a`, `svg:rect`, and
// `math:mtext`: these three reflect on all of them and nothing else reflects on
// any of them.
/** @internal */
export const FOREIGN_REPRESENTABLE_PROPERTIES: ReadonlySet<string> = new Set([
  'autofocus',
  'id',
  'tabIndex',
])

/** The HTML attribute a typed builder's DOM property reflects, or `undefined`
 *  when the property is not one the tables above describe.
 *
 * @internal */
export const reflectedAttributeName = (
  propertyName: string,
): string | undefined => {
  const renamed = RENAMED_PROPERTY_ATTRIBUTES[propertyName]
  if (renamed !== undefined) {
    return renamed
  }
  if (
    BOOLEAN_PROPERTIES.has(propertyName) ||
    PASSTHROUGH_PROPERTIES.has(propertyName) ||
    propertyName === 'draggable'
  ) {
    return propertyName
  }
  return undefined
}

// HTML attribute names are ASCII case-insensitive: a parser lowercases them,
// and `setAttribute` on an HTML element does the same. `h.Attribute('MULTIPLE',
// '')` and `h.Attribute('multiple', '')` therefore name one attribute, and any
// analysis that compares names verbatim reads the first as an unrelated one.
// Foreign content is left alone, where `viewBox` and `preserveAspectRatio` are
// case-sensitive names of their own.
const ASCII_UPPER = /[A-Z]/g

/** @internal */
export const toHtmlAttributeName = (name: string): string =>
  name.replace(ASCII_UPPER, letter => letter.toLowerCase())

const SVG_ATTRIBUTE_ADJUSTMENTS: Readonly<Record<string, string>> = {
  attributename: 'attributeName',
  attributetype: 'attributeType',
  basefrequency: 'baseFrequency',
  baseprofile: 'baseProfile',
  calcmode: 'calcMode',
  clippathunits: 'clipPathUnits',
  diffuseconstant: 'diffuseConstant',
  edgemode: 'edgeMode',
  filterunits: 'filterUnits',
  glyphref: 'glyphRef',
  gradienttransform: 'gradientTransform',
  gradientunits: 'gradientUnits',
  kernelmatrix: 'kernelMatrix',
  kernelunitlength: 'kernelUnitLength',
  keypoints: 'keyPoints',
  keysplines: 'keySplines',
  keytimes: 'keyTimes',
  lengthadjust: 'lengthAdjust',
  limitingconeangle: 'limitingConeAngle',
  markerheight: 'markerHeight',
  markerunits: 'markerUnits',
  markerwidth: 'markerWidth',
  maskcontentunits: 'maskContentUnits',
  maskunits: 'maskUnits',
  numoctaves: 'numOctaves',
  pathlength: 'pathLength',
  patterncontentunits: 'patternContentUnits',
  patterntransform: 'patternTransform',
  patternunits: 'patternUnits',
  pointsatx: 'pointsAtX',
  pointsaty: 'pointsAtY',
  pointsatz: 'pointsAtZ',
  preservealpha: 'preserveAlpha',
  preserveaspectratio: 'preserveAspectRatio',
  primitiveunits: 'primitiveUnits',
  refx: 'refX',
  refy: 'refY',
  repeatcount: 'repeatCount',
  repeatdur: 'repeatDur',
  requiredextensions: 'requiredExtensions',
  requiredfeatures: 'requiredFeatures',
  specularconstant: 'specularConstant',
  specularexponent: 'specularExponent',
  spreadmethod: 'spreadMethod',
  startoffset: 'startOffset',
  stddeviation: 'stdDeviation',
  stitchtiles: 'stitchTiles',
  surfacescale: 'surfaceScale',
  systemlanguage: 'systemLanguage',
  tablevalues: 'tableValues',
  targetx: 'targetX',
  targety: 'targetY',
  textlength: 'textLength',
  viewbox: 'viewBox',
  viewtarget: 'viewTarget',
  xchannelselector: 'xChannelSelector',
  ychannelselector: 'yChannelSelector',
  zoomandpan: 'zoomAndPan',
}

export const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
export const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

/** The attribute name produced by parsing HTML source in the given namespace.
 *
 * @internal
 */
export const parsedAttributeName = (
  namespace: string | undefined | null,
  name: string,
): string => {
  const lowerName = toHtmlAttributeName(name)
  if (namespace === SVG_NAMESPACE) {
    return SVG_ATTRIBUTE_ADJUSTMENTS[lowerName] ?? lowerName
  }
  if (namespace === MATHML_NAMESPACE && lowerName === 'definitionurl') {
    return 'definitionURL'
  }
  return lowerName
}

const HTML_PROPERTY_ELEMENTS: Readonly<Record<string, ReadonlySet<string>>> = {
  accept: new Set(['input']),
  action: new Set(['form']),
  alt: new Set(['area', 'img', 'input']),
  autocomplete: new Set(['form', 'input', 'select', 'textarea']),
  autoplay: new Set(['audio', 'video']),
  checked: new Set(['input']),
  cite: new Set(['blockquote', 'del', 'ins', 'q']),
  cols: new Set(['textarea']),
  colSpan: new Set(['td', 'th']),
  controls: new Set(['audio', 'video']),
  dateTime: new Set(['del', 'ins', 'time']),
  disabled: new Set([
    'button',
    'fieldset',
    'input',
    'link',
    'optgroup',
    'option',
    'select',
    'textarea',
  ]),
  download: new Set(['a', 'area']),
  enctype: new Set(['form']),
  formAction: new Set(['button', 'input']),
  formEnctype: new Set(['button', 'input']),
  formMethod: new Set(['button', 'input']),
  formNoValidate: new Set(['button', 'input']),
  formTarget: new Set(['button', 'input']),
  high: new Set(['meter']),
  href: new Set(['a', 'area', 'base', 'link']),
  htmlFor: new Set(['label', 'output', 'script']),
  isMap: new Set(['img']),
  label: new Set(['optgroup', 'option', 'track']),
  loop: new Set(['audio', 'video']),
  low: new Set(['meter']),
  max: new Set(['input', 'meter', 'progress']),
  maxLength: new Set(['input', 'textarea']),
  method: new Set(['form']),
  min: new Set(['input', 'meter']),
  minLength: new Set(['input', 'textarea']),
  multiple: new Set(['input', 'select']),
  muted: new Set(['audio', 'video']),
  name: new Set([
    'a',
    'button',
    'details',
    'embed',
    'fieldset',
    'form',
    'iframe',
    'img',
    'input',
    'map',
    'meta',
    'object',
    'output',
    'param',
    'select',
    'slot',
    'textarea',
  ]),
  noValidate: new Set(['form']),
  open: new Set(['details', 'dialog']),
  optimum: new Set(['meter']),
  pattern: new Set(['input']),
  placeholder: new Set(['input', 'textarea']),
  playsInline: new Set(['video']),
  poster: new Set(['video']),
  preload: new Set(['audio', 'video']),
  readOnly: new Set(['input', 'textarea']),
  rel: new Set(['a', 'area', 'form', 'link']),
  required: new Set(['input', 'select', 'textarea']),
  reversed: new Set(['ol']),
  rows: new Set(['textarea']),
  rowSpan: new Set(['td', 'th']),
  selected: new Set(['option']),
  size: new Set(['hr', 'input', 'select']),
  span: new Set(['col', 'colgroup']),
  src: new Set([
    'audio',
    'embed',
    'iframe',
    'img',
    'input',
    'script',
    'source',
    'track',
    'video',
  ]),
  start: new Set(['ol']),
  step: new Set(['input']),
  target: new Set(['a', 'area', 'base', 'form', 'link']),
  type: new Set([
    'a',
    'button',
    'embed',
    'input',
    'li',
    'link',
    'object',
    'ol',
    'param',
    'script',
    'source',
    'style',
    'ul',
  ]),
  value: new Set([
    'button',
    'data',
    'input',
    'li',
    'meter',
    'option',
    'output',
    'param',
    'progress',
    'select',
    'textarea',
  ]),
  wrap: new Set(['textarea']),
}

/** Whether assigning a typed property can be represented by parsed HTML for
 * the target element.
 *
 * @internal
 */
export const isHtmlPropertyRepresentable = (
  tagName: string,
  propertyName: string,
): boolean =>
  GLOBAL_ATTRIBUTE_PROPERTIES.has(propertyName) ||
  (Object.hasOwn(HTML_PROPERTY_ELEMENTS, propertyName) &&
    HTML_PROPERTY_ELEMENTS[propertyName]?.has(tagName.toLowerCase()) === true)

const CANONICAL_NUMBER_PROPERTIES: Readonly<
  Record<string, ReadonlySet<string>>
> = {
  li: new Set(['value']),
  meter: new Set(['high', 'low', 'max', 'min', 'optimum', 'value']),
  progress: new Set(['max', 'value']),
}

/** The attribute spelling produced by assigning a typed property on a fresh
 * element.
 *
 * @internal
 */
export const serializedHtmlPropertyValue = (
  tagName: string,
  propertyName: string,
  value: unknown,
): string => {
  const lowerTagName = tagName.toLowerCase()
  if (lowerTagName === 'textarea' && propertyName === 'cols' && value === 0) {
    return '20'
  }
  if (lowerTagName === 'textarea' && propertyName === 'rows' && value === 0) {
    return '2'
  }
  if (CANONICAL_NUMBER_PROPERTIES[lowerTagName]?.has(propertyName) === true) {
    return String(Number(value))
  }
  return String(value)
}

const STYLE_LIFECYCLE_KEYS: ReadonlySet<string> = new Set([
  'delayed',
  'destroy',
  'remove',
])
const CUSTOM_STYLE_PROPERTY_NAME = /^--(?:[A-Za-z0-9_-]|[^\u0000-\u007f])+$/
const STYLE_PROPERTY_NAME = /^-?[A-Za-z_][A-Za-z0-9_-]*$/

const canonicalStylePropertyName = (name: string): string =>
  name.startsWith('Webkit') ? `webkit${name.slice('Webkit'.length)}` : name

const cssDeclarationName = (name: string): string => {
  if (name.startsWith('--')) {
    return name
  }
  if (name === 'cssFloat') {
    return 'float'
  }
  const canonicalName = canonicalStylePropertyName(name)
  const kebabName = canonicalName
    .replace(ASCII_UPPER, letter => `-${letter}`)
    .toLowerCase()
  if (kebabName.startsWith('webkit-') || kebabName.startsWith('ms-')) {
    return `-${kebabName}`
  }
  return kebabName
}

const CSS_DECLARATION_PROPERTIES: ReadonlySet<string> = new Set(
  Array.from(CSS_STYLE_PROPERTIES, cssDeclarationName),
)

const hasUnsafeStyleSyntax = (value: string): boolean => {
  let quote: '"' | "'" | undefined
  let parentheses = 0
  let isComment = false
  for (let index = 0; index < value.length; index += 1) {
    const character = value.charAt(index)
    const next = value.charAt(index + 1)
    if (isComment) {
      if (character === '*' && next === '/') {
        isComment = false
        index += 1
      }
      continue
    }
    if (character === '\\') {
      if (next === '') {
        return true
      }
      index += 1
      continue
    }
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined
      }
      continue
    }
    if (character === '/' && next === '*') {
      isComment = true
      index += 1
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '(') {
      parentheses += 1
    } else if (character === ')') {
      if (parentheses === 0) {
        return true
      }
      parentheses -= 1
    } else if (parentheses === 0 && (character === ';' || character === '!')) {
      return true
    }
  }
  return quote !== undefined || parentheses !== 0 || isComment
}

/** Refuses style entries whose property assignment and serialized declaration
 * can describe different CSS.
 *
 * @internal
 */
export const assertStyleIsRepresentable = (
  style: Readonly<Record<string, unknown>>,
): void => {
  const declarationOwners = new Map<string, string>()
  for (const name of Object.keys(style)) {
    if (STYLE_LIFECYCLE_KEYS.has(name)) {
      throw new Error(
        `[foldkit] h.Style property ${JSON.stringify(name)} is a Snabbdom ` +
          'lifecycle control rather than a CSS property. Foldkit h.Style ' +
          'accepts only declarations applied while the element exists.',
      )
    }
    if (
      name === 'cssText' ||
      (name.startsWith('--')
        ? !CUSTOM_STYLE_PROPERTY_NAME.test(name)
        : !STYLE_PROPERTY_NAME.test(name))
    ) {
      throw new Error(
        `[foldkit] h.Style property ${JSON.stringify(name)} cannot be ` +
          'represented as one inline CSS declaration. Use a CSS property ' +
          'name without declaration delimiters.',
      )
    }
    const canonicalName = canonicalStylePropertyName(name)
    if (
      !name.startsWith('--') &&
      !CSS_STYLE_PROPERTIES.has(canonicalName) &&
      !CSS_DECLARATION_PROPERTIES.has(name)
    ) {
      throw new Error(
        `[foldkit] h.Style property ${JSON.stringify(name)} is not a ` +
          'CSSStyleDeclaration property supported by Foldkit. Use a known ' +
          'camel-case or declaration name, or a custom property beginning --.',
      )
    }
    const declarationName = cssDeclarationName(name)
    const existingOwner = declarationOwners.get(declarationName)
    if (existingOwner !== undefined) {
      throw new Error(
        `[foldkit] h.Style properties ${JSON.stringify(existingOwner)} and ` +
          `${JSON.stringify(name)} both name the ${JSON.stringify(declarationName)} ` +
          'CSS declaration. Keep one spelling so the server, fresh client, ' +
          'and hydration have one owner for it.',
      )
    }
    declarationOwners.set(declarationName, name)
    const value = style[name]
    if (typeof value !== 'string') {
      throw new Error(
        `[foldkit] h.Style value for ${JSON.stringify(name)} must be a ` +
          'string. Browser CSSOM assignment coerces other values while server ' +
          'serialization cannot preserve the same authored declaration.',
      )
    }
    if (hasUnsafeStyleSyntax(value)) {
      throw new Error(
        `[foldkit] h.Style value for ${JSON.stringify(name)} contains a ` +
          'unsafe CSS declaration syntax. Assigning one DOM style ' +
          'property rejects that value, while serializing it into a style ' +
          'attribute could activate additional or !important declarations. ' +
          'Keep the value to one declaration.',
      )
    }
  }
}

/** The CSS declaration name corresponding to a CSSStyleDeclaration property.
 *
 * @internal
 */
export const serializedStylePropertyName = (name: string): string => {
  return cssDeclarationName(name)
}

/** A style object keyed by the declaration names shared by CSSOM and HTML.
 *
 * @internal
 */
export const normalizedStyleProperties = (
  style: Readonly<Record<string, unknown>>,
): Record<string, string> => {
  assertStyleIsRepresentable(style)
  return Object.fromEntries(
    Object.entries(style).map(([name, value]) => [
      cssDeclarationName(name),
      String(value),
    ]),
  )
}

/** Inline style source whose parsed declarations match fresh CSSOM property
 * assignment, excluding Snabbdom lifecycle controls.
 *
 * @internal
 */
export const serializedStyleAttribute = (
  style: Readonly<Record<string, unknown>>,
): string | undefined => {
  const declarations = Object.entries(style).flatMap(([name, value]) =>
    STYLE_LIFECYCLE_KEYS.has(name) || typeof value !== 'string' || value === ''
      ? []
      : [`${cssDeclarationName(name)}: ${value}`],
  )
  const serialized = declarations.join('; ')
  return serialized === '' ? undefined : serialized
}

/** The value of an HTML attribute written under any ASCII casing, or
 *  `undefined` when no spelling of it is present.
 *
 * @internal */
export const htmlAttributeValue = (
  attributes: Readonly<Record<string, unknown>> | undefined,
  name: string,
): unknown => {
  if (attributes === undefined) {
    return undefined
  }
  let value: unknown
  for (const written of Object.keys(attributes)) {
    if (toHtmlAttributeName(written) === name) {
      value = attributes[written]
    }
  }
  return value
}
