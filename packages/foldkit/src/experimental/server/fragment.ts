import type { DefaultTreeAdapterMap } from 'parse5'
import { html as Parse5Html, parseFragment } from 'parse5'

/** The same rendered fragment parsed with scripting enabled and disabled. When
 *  the markup parses identically in both modes, both fields hold the same tree.
 * @internal
 */
export type ParsedFragmentModes = Readonly<{
  scripted: DefaultTreeAdapterMap['documentFragment']
  unscripted: DefaultTreeAdapterMap['documentFragment']
}>

// NOTE: parse5 reads the scripting flag only when it meets a `<noscript>` start
// tag, and it matches tag names ASCII case-insensitively, so markup without that
// text parses identically in both modes. Text that only mentions `<noscript` in
// an attribute value or a comment costs a second parse and never skips a needed
// one. A `<noscript>` insertion context gets both parses as well. The HTML
// standard reads its content as raw text only when scripting is enabled. parse5
// 8.0 reads it as raw text in both modes, but the `^8` range admits a release
// that follows the standard.
const NOSCRIPT_START_TAG = /<noscript/i

const isScriptingSensitive = (html: string): boolean =>
  NOSCRIPT_START_TAG.test(html)

/** Whether `element` is an HTML `<noscript>`, the only kind whose content the
 *  parser reads differently with scripting enabled and disabled. An element of
 *  that name inside SVG or MathML is an ordinary foreign element.
 * @internal
 */
export const isHtmlNoscript = (
  element: DefaultTreeAdapterMap['element'],
): boolean =>
  element.tagName.toLowerCase() === 'noscript' &&
  element.namespaceURI === Parse5Html.NS.HTML

/** The scripting modes to parse `sources` in: enabled and disabled when any
 *  source contains `<noscript` in any letter case, enabled alone otherwise.
 * @internal
 */
export const scriptingModesFor = (
  ...sources: ReadonlyArray<string>
): ReadonlyArray<boolean> =>
  sources.some(isScriptingSensitive) ? [true, false] : [true]

/** Parses both scripting modes in the supplied HTML insertion context, once
 *  when the markup parses identically in both.
 * @internal
 */
export const parseFragmentModes = (
  context: DefaultTreeAdapterMap['element'],
  html: string,
  options: Readonly<{ sourceCodeLocationInfo?: boolean }> = {},
): ParsedFragmentModes => {
  const scripted = parseFragment(context, html, {
    ...options,
    scriptingEnabled: true,
  })

  if (isScriptingSensitive(html) || isHtmlNoscript(context)) {
    return {
      scripted,
      unscripted: parseFragment(context, html, {
        ...options,
        scriptingEnabled: false,
      }),
    }
  } else {
    return { scripted, unscripted: scripted }
  }
}

/** The distinct trees in `fragments`, so a check that must hold in every mode
 *  walks a shared tree once.
 * @internal
 */
export const distinctFragments = (
  fragments: ParsedFragmentModes,
): ReadonlyArray<DefaultTreeAdapterMap['documentFragment']> =>
  fragments.scripted === fragments.unscripted
    ? [fragments.scripted]
    : [fragments.scripted, fragments.unscripted]
