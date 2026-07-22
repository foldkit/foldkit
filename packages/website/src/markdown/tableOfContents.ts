import { Array, Match as M, Option, Result, pipe } from 'effect'

import type { Heading, MarkdownDocument } from '@foldkit/markdown'

import type { TableOfContentsEntry } from '../main'
import { inlineToText, slugify } from './slug'

// HEADINGS

/** Stable heading ids by node identity, shared by the view and the extractor. */
export type HeadingIds = ReadonlyMap<Heading, string>

/** The extracted table of contents plus the id assigned to every heading. */
export type CollectedHeadings = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  idByHeading: HeadingIds
}>

const tableOfContentsEntry = (
  heading: Heading,
  id: string,
): Result.Result<TableOfContentsEntry, void> => {
  const text = inlineToText(heading.content)

  return M.value(heading.level).pipe(
    M.withReturnType<Result.Result<TableOfContentsEntry, void>>(),
    M.when(2, () => Result.succeed({ id, level: 'h2', text })),
    M.when(3, () => Result.succeed({ id, level: 'h3', text })),
    M.when(4, () => Result.succeed({ id, level: 'h4', text })),
    M.orElse(() => Result.failVoid),
  )
}

/**
 * Walks a document's top-level blocks, assigns a slug id to every heading
 * (deduplicating repeats within the document), and returns both the id map and
 * the `h2`–`h4` table of contents the sidebar consumes. Assigning ids here, once
 * per document, keeps the heading view and the sidebar in agreement by
 * construction.
 */
export const collectHeadings = (
  document: MarkdownDocument,
): CollectedHeadings => {
  const idByHeading = new Map<Heading, string>()
  const slugCounts = new Map<string, number>()

  const tableOfContents = Array.filterMap(document.blocks, block =>
    M.value(block).pipe(
      M.withReturnType<Result.Result<TableOfContentsEntry, void>>(),
      M.tag('Heading', heading => {
        const base = slugify(inlineToText(heading.content))
        const priorCount = slugCounts.get(base) ?? 0
        slugCounts.set(base, priorCount + 1)
        const id = priorCount === 0 ? base : `${base}-${priorCount + 1}`
        idByHeading.set(heading, id)
        return tableOfContentsEntry(heading, id)
      }),
      M.orElse(() => Result.failVoid),
    ),
  )

  return { tableOfContents, idByHeading }
}

/** Resolves a heading's id from the shared map, falling back to a fresh slug. */
export const headingId = (idByHeading: HeadingIds, heading: Heading): string =>
  pipe(
    Option.fromNullishOr(idByHeading.get(heading)),
    Option.getOrElse(() => slugify(inlineToText(heading.content))),
  )
