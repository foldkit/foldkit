// What the server serializer may assume about an entry in a vnode's
// `data.props`. A DOM property name alone does not say what the property means:
// `innerHTML` is markup the view author intends to be parsed when `h.InnerHTML`
// wrote it and an arbitrary client-only value when anything else did, and `id`
// on a custom element is a reflected HTML attribute when `h.Id` wrote it and a
// component-private value when `CustomElement.define` did.
//
// Both marks belong to the last write, not to the props bag, which is what stops
// a value the serializer trusts from standing in for one written after it. The
// serializer always emits the value that is in `props`, and the marks always
// describe the builder that put it there.
//
// The marks live under symbol keys, so `Object.keys` never surfaces them, the
// props module never applies them to the DOM, the attribute serializer never
// emits them, and no string-keyed property can forge them. Object spread copies
// own enumerable symbol keys, so a copied props bag keeps its marks.

const TRUSTED_INNER_HTML: unique symbol = Symbol('foldkit/trusted-inner-html')

const CLIENT_ONLY_PROPERTIES: unique symbol = Symbol(
  'foldkit/client-only-properties',
)

type MarkedProps = Record<string | symbol, unknown> & {
  [TRUSTED_INNER_HTML]?: unknown
  [CLIENT_ONLY_PROPERTIES]?: Set<string>
}

const markedProps = (props: Readonly<Record<string, unknown>>): MarkedProps =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  props as MarkedProps

/** Records `value` as markup `h.InnerHTML` wrote. The value itself is the mark,
 *  so a later generic write to `innerHTML` no longer matches and the markup it
 *  wrote is never treated as trusted.
 *
 * @internal
 */
export const markTrustedInnerHtml = (
  props: Record<string, unknown>,
  value: string,
): void => {
  const marked = markedProps(props)
  marked[TRUSTED_INNER_HTML] = value
  marked[CLIENT_ONLY_PROPERTIES]?.delete('innerHTML')
}

/** Records `name` as a property a builder wrote without claiming it is markup:
 *  an internal `Prop`, which is also what a `CustomElement.define` property
 *  factory produces.
 *
 * @internal
 */
export const markClientOnlyProperty = (
  props: Record<string, unknown>,
  name: string,
): void => {
  const marked = markedProps(props)
  const names = (marked[CLIENT_ONLY_PROPERTIES] ??= new Set())
  names.add(name)
  if (name === 'innerHTML') {
    Reflect.deleteProperty(marked, TRUSTED_INNER_HTML)
  }
}

/** Drops the client-only mark from `name`, for a typed attribute builder
 *  overwriting a property a generic write left behind.
 *
 * @internal
 */
export const unmarkClientOnlyProperty = (
  props: Record<string, unknown>,
  name: string,
): void => {
  markedProps(props)[CLIENT_ONLY_PROPERTIES]?.delete(name)
}

/** Whether `props.innerHTML` is the markup `h.InnerHTML` wrote, rather than an
 *  arbitrary property that happens to carry that name.
 *
 * @internal
 */
export const hasTrustedInnerHtml = (
  props: Readonly<Record<string, unknown>> | undefined,
): boolean => {
  if (props === undefined) {
    return false
  }
  const marked = markedProps(props)
  const innerHtml = marked['innerHTML']
  return (
    typeof innerHtml === 'string' && marked[TRUSTED_INNER_HTML] === innerHtml
  )
}

/** Whether `name` is a client-only DOM property rather than the HTML attribute
 *  it is named after.
 *
 * @internal
 */
export const isClientOnlyProperty = (
  props: Readonly<Record<string, unknown>> | undefined,
  name: string,
): boolean => {
  if (props === undefined) {
    return false
  }
  return markedProps(props)[CLIENT_ONLY_PROPERTIES]?.has(name) === true
}
