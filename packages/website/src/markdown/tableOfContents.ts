import { Array, Match, Option, Result, pipe } from 'effect'

import type { Heading, MarkdownDocument } from '@foldkit/markdown'

import type { TableOfContentsEntry } from '../tableOfContentsEntry'
import { parseHeadingId, slugify } from './slug'

// TABLE OF CONTENTS

/** Stable heading ids by node identity, shared by the view and the extractor. */
export type HeadingIds = ReadonlyMap<Heading, string>

/** The extracted table of contents plus the id assigned to every heading. */
export type CollectedHeadings = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  idByHeading: HeadingIds
}>

const uniqueHeadingId = (
  base: string,
  usedIds: ReadonlySet<string>,
): string => {
  if (usedIds.has(base)) {
    let suffix = 2
    while (usedIds.has(`${base}-${suffix}`)) {
      suffix += 1
    }
    return `${base}-${suffix}`
  } else {
    return base
  }
}

const tableOfContentsEntry = (
  heading: Heading,
  id: string,
  text: string,
): Result.Result<TableOfContentsEntry, void> =>
  Match.value(heading.level).pipe(
    Match.withReturnType<Result.Result<TableOfContentsEntry, void>>(),
    Match.when(2, () => Result.succeed({ id, level: 'h2', text })),
    Match.when(3, () => Result.succeed({ id, level: 'h3', text })),
    Match.when(4, () => Result.succeed({ id, level: 'h4', text })),
    Match.orElse(() => Result.failVoid),
  )

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
  const usedIds = new Set<string>()

  const tableOfContents = Array.filterMap(document.blocks, block =>
    Match.value(block).pipe(
      Match.withReturnType<Result.Result<TableOfContentsEntry, void>>(),
      Match.tag('Heading', heading => {
        const { maybeId, text } = parseHeadingId(heading.content)
        const base = Option.getOrElse(maybeId, () => slugify(text))
        const id = uniqueHeadingId(base, usedIds)
        usedIds.add(id)
        idByHeading.set(heading, id)
        return tableOfContentsEntry(heading, id, text)
      }),
      Match.orElse(() => Result.failVoid),
    ),
  )

  return { tableOfContents, idByHeading }
}

/** Resolves a heading's id from the shared map, falling back to a fresh slug. */
export const headingId = (idByHeading: HeadingIds, heading: Heading): string =>
  pipe(
    Option.fromNullishOr(idByHeading.get(heading)),
    Option.getOrElse(() => {
      const { maybeId, text } = parseHeadingId(heading.content)
      return Option.getOrElse(maybeId, () => slugify(text))
    }),
  )
