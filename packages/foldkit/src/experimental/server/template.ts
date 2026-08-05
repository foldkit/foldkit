import { type RenderedApplication } from './server.js'

const TITLE_PATTERN = /<title>[^<]*<\/title>/
const HTML_OPEN_TAG_PATTERN = /<html([^>]*)>/
const CANONICAL_LINK_PATTERN = /<link([^>]*rel="canonical"[^>]*?)\s*\/?>/
const OG_URL_META_PATTERN = /<meta([^>]*property="og:url"[^>]*?)\s*\/?>/

const DEFAULT_CONTAINER_ID = 'root'

const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const setAttribute = (
  attributes: string,
  name: string,
  value: string,
): string => {
  const withoutExisting = attributes.replace(
    new RegExp(`\\s${name}="[^"]*"`, 'i'),
    '',
  )
  return `${withoutExisting} ${name}="${escapeAttribute(value)}"`
}

// NOTE: rewrites the `<html>` element's `lang` and `dir` from the server
// render so the served shell carries the right language on first paint,
// before the runtime boots. Only sets an attribute the render provides,
// leaving the template's value in place otherwise.
const applyRootAttributes = (
  template: string,
  lang: string | undefined,
  dir: string | undefined,
): string => {
  if (lang === undefined && dir === undefined) {
    return template
  }
  return template.replace(HTML_OPEN_TAG_PATTERN, (_match, attributes) => {
    let nextAttributes = attributes
    if (lang !== undefined) {
      nextAttributes = setAttribute(nextAttributes, 'lang', lang)
    }
    if (dir !== undefined) {
      nextAttributes = setAttribute(nextAttributes, 'dir', dir)
    }
    return `<html${nextAttributes}>`
  })
}

const stampCanonical = (
  template: string,
  canonical: string | undefined,
): string => {
  if (canonical === undefined) {
    return template
  }
  return template.replace(
    CANONICAL_LINK_PATTERN,
    (_match, attributes) =>
      `<link${setAttribute(attributes, 'href', canonical)} />`,
  )
}

const stampOgUrl = (template: string, ogUrl: string | undefined): string => {
  if (ogUrl === undefined) {
    return template
  }
  return template.replace(
    OG_URL_META_PATTERN,
    (_match, attributes) =>
      `<meta${setAttribute(attributes, 'content', ogUrl)} />`,
  )
}

const containerPlaceholder = (containerId: string): string =>
  `<div id="${containerId}"></div>`

/** Options for {@link injectIntoTemplate}.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type InjectIntoTemplateOptions = Readonly<{
  /** The `id` of the exact `<div id="..."></div>` placeholder the rendered
   *  markup replaces. Defaults to `'root'`. */
  containerId?: string
}>

/**
 * Places a rendered page into an HTML template.
 *
 * The rendered markup (root element plus the flags payload script) replaces
 * the empty container element, so the booting runtime finds the root by its
 * `data-foldkit-app` stamp and hydrates in place. The `Document` head fields
 * are stamped into the shell so the served HTML is correct before the runtime
 * boots: `title` replaces the `<title>` text, `lang` and `dir` are set on the
 * `<html>` element, `canonical` replaces the `href` of a
 * `<link rel="canonical">` element, and `ogUrl` replaces the `content` of a
 * `<meta property="og:url">` element. A field the render omits, or a head
 * element the template does not carry, leaves the template untouched at that
 * spot.
 *
 * The container contract is deliberately exact. The template must contain
 * one `<div id="root"></div>` placeholder, or the equivalent exact markup for
 * `containerId`, with no additional attributes or whitespace inside it. It
 * must also contain exactly one `<title>` element. Throws when either required
 * location is missing or appears more than once.
 *
 * This helper is pure string work with no module state, so a host process may
 * import it directly even when the render itself must stay inside the server
 * entry's module graph.
 *
 * @example
 * ```typescript
 * const page = injectIntoTemplate(template, rendered)
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const injectIntoTemplate = (
  template: string,
  rendered: RenderedApplication,
  options?: InjectIntoTemplateOptions,
): string => {
  const containerId = options?.containerId ?? DEFAULT_CONTAINER_ID
  const placeholder = containerPlaceholder(containerId)
  if (!template.includes(placeholder)) {
    throw new Error(
      `[foldkit] injectIntoTemplate found no exact ${placeholder} placeholder in the template. ` +
        'Add that markup where the application root belongs, or pass the container id the template uses.',
    )
  }
  if (template.replace(placeholder, '').includes(placeholder)) {
    throw new Error(
      `[foldkit] injectIntoTemplate found more than one ${placeholder} placeholder in the template. ` +
        'Keep exactly one placeholder for each application root.',
    )
  }
  if (!TITLE_PATTERN.test(template)) {
    throw new Error(
      '[foldkit] injectIntoTemplate found no <title> element in the template. ' +
        'Add exactly one <title> where the rendered Document title belongs.',
    )
  }
  if (TITLE_PATTERN.test(template.replace(TITLE_PATTERN, ''))) {
    throw new Error(
      '[foldkit] injectIntoTemplate found more than one <title> element in the template. ' +
        'Keep exactly one title for the rendered Document.',
    )
  }
  const withHeadFields = stampOgUrl(
    stampCanonical(
      applyRootAttributes(template, rendered.lang, rendered.dir),
      rendered.canonical,
    ),
    rendered.ogUrl,
  )
  // NOTE: the body and title replacements are passed as functions. A string
  // second argument to `String.replace` treats `$&`, `$\``, `$'`, and `$$` as
  // insertion patterns, so a `$` sequence in the rendered markup or title
  // would corrupt the output; a replacer function inserts its return value
  // verbatim.
  return withHeadFields
    .replace(
      TITLE_PATTERN,
      () => `<title>${escapeText(rendered.title)}</title>`,
    )
    .replace(placeholder, () => rendered.html)
}
