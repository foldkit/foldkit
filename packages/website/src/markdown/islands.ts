import { Option } from 'effect'
import { html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type Message } from '../message'
import { infoCalloutBlocks, warningCalloutBlocks } from '../prose'
import { type CopiedSnippets, highlightedCodeBlock } from '../view/codeBlock'
import { islandAttributes } from './islandAttributes'
import { lookupSnippet } from './snippets'

// ISLANDS

const warnedMissingSnippetNames = new Set<string>()

const warnMissingSnippetOnce = (name: string): void => {
  if (!warnedMissingSnippetNames.has(name)) {
    warnedMissingSnippetNames.add(name)
    console.warn(
      `[docs] No snippet registered for "${name}". ` +
        'Add the file under src/snippet, or fix the ::Snippet name attribute.',
    )
  }
}

/**
 * The site's island views, paired with {@link islandAttributes} so attributes
 * arrive already decoded. `Snippet` renders a build-time highlighted source file
 * with the standard copy affordance; `Info` and `Warning` wrap nested markdown
 * in the prose callouts. The copy state lives in the app Model, so the view
 * closes over `copiedSnippets`.
 */
export const docIslands = (
  copiedSnippets: CopiedSnippets,
): Markdown.Islands => {
  const h = html<Message>()

  return Markdown.islandsFor(islandAttributes, {
    Snippet: ({ name, label, class: className }) =>
      Option.match(lookupSnippet(name), {
        onNone: () => {
          warnMissingSnippetOnce(name)
          return h.empty
        },
        onSome: snippet =>
          highlightedCodeBlock(
            h.div([h.Class('text-sm'), h.InnerHTML(snippet.highlighted)], []),
            snippet.raw,
            label === undefined
              ? 'Copy snippet to clipboard'
              : `Copy ${label} to clipboard`,
            copiedSnippets,
            className ?? 'mb-8',
          ),
      }),

    Info: ({ label }, content) => infoCalloutBlocks(label, content),

    Warning: ({ label }, content) => warningCalloutBlocks(label, content),
  })
}
