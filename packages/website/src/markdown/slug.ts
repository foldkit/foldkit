import {
  Array,
  Match as M,
  Option,
  Predicate,
  String,
  flow,
  pipe,
} from 'effect'
import type { Html } from 'foldkit/html'

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
 * Derives a URL fragment id from heading text: lowercased, with apostrophes
 * dropped, every run of non-alphanumeric characters collapsed to a single dash,
 * and surrounding dashes trimmed. `"HTTP Requests"` becomes `"http-requests"`.
 * Apostrophes go before the collapse so a contraction stays one word:
 * `"Don’t Compute in Update"` becomes `"dont-compute-in-update"`, not
 * `"don-t-compute-in-update"`.
 */
export const slugify: (text: string) => string = flow(
  String.replaceAll(/['’]/g, ''),
  String.toLowerCase,
  String.replaceAll(/[^a-z0-9]+/g, '-'),
  String.replaceAll(/^-+|-+$/g, ''),
)

const HEADING_ID_OVERRIDE_PATTERN = /^(.*?)\s*\{#([A-Za-z0-9-]+)\}$/

const hasTerminalPlainText = (content: ReadonlyArray<Inline>): boolean =>
  Option.exists(Array.last(content), last => last._tag === 'Text')

/**
 * Reads an optional trailing `{#custom-id}` override off a heading's inline
 * content. The override counts only when the marker is the heading's terminal
 * plain-text run: `## createLazy {#create-lazy}` returns
 * `{ maybeId: Some("create-lazy"), text: "createLazy" }`. A marker nested inside
 * emphasis or inline code (`## **Use {#use}**`) is left as ordinary text, because
 * the rendered heading can only strip a terminal plain-text marker. Returning
 * `{ maybeId: None, text: <the whole flattened heading> }` there keeps the derived
 * id and the visible heading in agreement. The override pins an anchor that
 * `slugify` alone would not produce.
 */
export const parseHeadingId = (
  content: ReadonlyArray<Inline>,
): Readonly<{ maybeId: Option.Option<string>; text: string }> => {
  const raw = inlineToText(content)
  const maybeOverride = hasTerminalPlainText(content)
    ? String.match(HEADING_ID_OVERRIDE_PATTERN)(raw)
    : Option.none<RegExpMatchArray>()

  return Option.match(maybeOverride, {
    onNone: () => ({ maybeId: Option.none(), text: raw }),
    onSome: ([, base = raw, id]) => ({
      maybeId: Option.fromNullishOr(id),
      text: base,
    }),
  })
}

const HEADING_ID_MARKER_SUFFIX_PATTERN = /\s*\{#[A-Za-z0-9-]+\}$/

/**
 * Drops a trailing `{#custom-id}` marker from a heading's rendered inline content,
 * leaving inline formatting intact. The marker is plain text, so it is always the
 * final string element: `["Use ", codeHtml, " {#lazy}"]` becomes `["Use ",
 * codeHtml]`.
 */
export const stripHeadingIdMarker = (
  content: ReadonlyArray<Html | string>,
): ReadonlyArray<Html | string> =>
  Array.matchRight(content, {
    onEmpty: () => content,
    onNonEmpty: (init, last) => {
      if (Predicate.isString(last)) {
        const stripped = String.replace(
          HEADING_ID_MARKER_SUFFIX_PATTERN,
          '',
        )(last)
        return String.isEmpty(stripped) ? init : Array.append(init, stripped)
      } else {
        return content
      }
    },
  })
