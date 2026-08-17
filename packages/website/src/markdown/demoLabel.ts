import { Array, Match as M, Option, Record as Record_ } from 'effect'

import type { Island, MarkdownDocument } from '@foldkit/markdown'

import type { HeadingIds } from './tableOfContents'

// DEMO LABEL

/** The id of the heading each `::Demo` island sits under, by the demo's name. */
export type DemoLabels = ReadonlyMap<string, string>

type DemoLabelEntry = readonly [demoName: string, headingId: string]

type DemoLabelWalk = Readonly<{
  maybeHeadingId: Option.Option<string>
  entries: ReadonlyArray<DemoLabelEntry>
}>

const DEMO_ISLAND_NAME = 'Demo'

const demoLabelEntry = (
  island: Island,
  maybeHeadingId: Option.Option<string>,
): Option.Option<DemoLabelEntry> => {
  if (island.name === DEMO_ISLAND_NAME) {
    return Option.map(
      Option.all([Record_.get(island.attributes, 'name'), maybeHeadingId]),
      ([demoName, headingId]) => [demoName, headingId],
    )
  } else {
    return Option.none()
  }
}

/**
 * Pairs every `::Demo` island with the heading it sits under, so the island view
 * can render the demo as a region labelled by that heading. Ids come from the map
 * {@link collectHeadings} already assigned rather than a second slug pass, so a
 * demo's label cannot drift from the heading it points at. A demo with no heading
 * above it is absent from the map and renders unlabelled.
 */
export const collectDemoLabels = (
  document: MarkdownDocument,
  idByHeading: HeadingIds,
): DemoLabels =>
  new Map(
    Array.reduce(
      document.blocks,
      {
        maybeHeadingId: Option.none<string>(),
        entries: Array.empty<DemoLabelEntry>(),
      },
      (walk: DemoLabelWalk, block) =>
        M.value(block).pipe(
          M.withReturnType<DemoLabelWalk>(),
          M.tag('Heading', heading => ({
            maybeHeadingId: Option.fromNullishOr(idByHeading.get(heading)),
            entries: walk.entries,
          })),
          M.tag('Island', island =>
            Option.match(demoLabelEntry(island, walk.maybeHeadingId), {
              onNone: () => walk,
              onSome: entry => ({
                maybeHeadingId: walk.maybeHeadingId,
                entries: Array.append(walk.entries, entry),
              }),
            }),
          ),
          M.orElse(() => walk),
        ),
    ).entries,
  )
