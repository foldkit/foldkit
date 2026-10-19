import type { DefaultTreeAdapterMap } from 'parse5'
import { parseFragment } from 'parse5'

/** The same rendered fragment parsed with scripting enabled and disabled.
 * @internal
 */
export type ParsedFragmentModes = Readonly<{
  scripted: DefaultTreeAdapterMap['documentFragment']
  unscripted: DefaultTreeAdapterMap['documentFragment']
}>

/** Parses both scripting modes in the supplied HTML insertion context.
 * @internal
 */
export const parseFragmentModes = (
  context: DefaultTreeAdapterMap['element'],
  html: string,
  options: Readonly<{ sourceCodeLocationInfo?: boolean }> = {},
): ParsedFragmentModes => ({
  scripted: parseFragment(context, html, {
    ...options,
    scriptingEnabled: true,
  }),
  unscripted: parseFragment(context, html, {
    ...options,
    scriptingEnabled: false,
  }),
})
