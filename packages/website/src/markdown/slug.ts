import { Array, Match as M, pipe } from 'effect'

import type { Inline } from '@foldkit/markdown'

// SLUG

/**
 * Flattens inline markdown content to its plain text, dropping formatting. Used
 * to derive heading ids, heading aria labels, and table of contents entry text
 * from a heading's inline content.
 */
export const inlineToText = (content: ReadonlyArray<Inline>): string =>
  pipe(
    content,
    Array.map(inline =>
      M.value(inline).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
          Text: ({ value }) => value,
          InlineCode: ({ value }) => value,
          HardBreak: () => ' ',
          Emphasis: ({ content }) => inlineToText(content),
          Strong: ({ content }) => inlineToText(content),
          Strikethrough: ({ content }) => inlineToText(content),
          Link: ({ content }) => inlineToText(content),
          Image: ({ alt }) => alt,
        }),
      ),
    ),
    Array.join(''),
  )

/**
 * Derives a URL fragment id from heading text: lowercased, with every run of
 * non-alphanumeric characters collapsed to a single dash and surrounding dashes
 * trimmed. `"HTTP Requests"` becomes `"http-requests"`.
 */
export const slugify = (text: string): string => {
  const lowered = text.toLowerCase()
  const dashed = lowered.replace(/[^a-z0-9]+/g, '-')
  return dashed.replace(/^-+|-+$/g, '')
}
