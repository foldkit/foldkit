import { Schema } from 'effect'

import { escapeAttributeValue } from './serialize.js'
import type { RenderedApplication } from './server.js'
import { injectIntoTemplate } from './template.js'

/** Browser assets supplied to the server entry's document renderer.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const DocumentAssets = Schema.Struct({
  entryScript: Schema.String,
  stylesheets: Schema.Array(Schema.String),
  modulePreloads: Schema.Array(Schema.String),
})

/** The resolved browser asset URLs for one document.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type DocumentAssets = typeof DocumentAssets.Type

/** Produces a complete HTML document from application markup and browser assets.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type DocumentRenderer = (
  application: RenderedApplication,
  assets: DocumentAssets,
) => string

/** Author-owned defaults and additional head markup for {@link renderDocument}.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type DocumentOptions = Readonly<{
  /** Default language, overridden by the application's Document. Defaults to English. */
  lang?: string
  /** Trusted HTML to add to the head, such as a favicon or site-wide metadata. Never pass unescaped request data. */
  head?: string
}>

/** Renders a complete document with UTF-8, a viewport, application metadata,
 * stylesheets, module preloads, and the client entry. The application supplies
 * the title, language, direction, canonical URL, and Open Graph URL. Additional
 * head markup belongs to the server entry through {@link DocumentOptions}.
 *
 * The rendered application's hydration markers and Flags payload are preserved.
 * Ambiguous application roots or handoff markers are rejected.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const renderDocument = (
  application: RenderedApplication,
  assets: DocumentAssets,
  options: DocumentOptions = {},
): string => {
  const stylesheets = assets.stylesheets.map(
    href =>
      `<link rel="stylesheet" crossorigin href="${escapeAttributeValue(href)}">`,
  )
  const modulePreloads = assets.modulePreloads.map(
    href =>
      `<link rel="modulepreload" crossorigin href="${escapeAttributeValue(href)}">`,
  )
  const canonical =
    application.canonical === undefined ? '' : '<link rel="canonical" href="">'
  const ogUrl =
    application.ogUrl === undefined ? '' : '<meta property="og:url" content="">'
  const document = [
    '<!doctype html>',
    `<html lang="${escapeAttributeValue(options.lang ?? 'en')}">`,
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title></title>',
    canonical,
    ogUrl,
    options.head ?? '',
    ...modulePreloads,
    ...stylesheets,
    '</head><body><div id="root"></div>',
    `<script type="module" crossorigin src="${escapeAttributeValue(assets.entryScript)}"></script>`,
    '</body></html>',
  ].join('\n')

  return injectIntoTemplate(document, application)
}
