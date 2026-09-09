import { Array, HashMap, HashSet, Option } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  collectMatchingEntries,
  countEntriesByTag,
  findUnanchoredPattern,
  formatIndexNotReadable,
  isIndexReadable,
  matchesAnyPathPattern,
  matchesPathPattern,
  pageMatchingEntries,
  pathOrder,
  readSummarizedValueAt,
} from './historyQuery.js'
import {
  type HistoryEntry,
  INIT_INDEX,
  type StoreState,
  latestEntryIndex,
} from './store.js'

const makeEntry = (
  tag: string,
  changedPaths: ReadonlyArray<string> = [],
): HistoryEntry => ({
  tag,
  message: { _tag: tag },
  commands: Array.empty(),
  mountStarts: [],
  mountEnds: [],
  timestamp: 0,
  isModelChanged: Array.isReadonlyArrayNonEmpty(changedPaths),
  diff: {
    changedPaths: HashSet.fromIterable(changedPaths),
    affectedPaths: HashSet.fromIterable(changedPaths),
  },
})

const makeState = (
  entries: ReadonlyArray<HistoryEntry>,
  startIndex = 0,
  maybeInitModel: Option.Option<unknown> = Option.some({}),
): StoreState => ({
  entries,
  keyframes: HashMap.empty(),
  maybeInitModel,
  initCommands: [],
  initMountStarts: [],
  startIndex,
  isPaused: false,
  pausedAtIndex: 0,
  maybeLatestModel: Option.none(),
})

describe('matchesPathPattern', () => {
  it('matches an exact path', () => {
    expect(matchesPathPattern('root.grid.5.3', 'root.grid.5.3')).toBe(true)
  })

  it('matches changes below the pattern', () => {
    expect(matchesPathPattern('root.grid.5.3', 'root.grid')).toBe(true)
  })

  it('matches wholesale replacements above the pattern', () => {
    expect(matchesPathPattern('root.grid', 'root.grid.5.3')).toBe(true)
  })

  it('matches a single segment with a wildcard', () => {
    expect(matchesPathPattern('root.cards.3.title', 'root.cards.*.title')).toBe(
      true,
    )
  })

  it('rejects when segments after a wildcard differ', () => {
    expect(matchesPathPattern('root.cards.3.color', 'root.cards.*.title')).toBe(
      false,
    )
  })

  it('rejects a different branch', () => {
    expect(matchesPathPattern('root.user.name', 'root.grid')).toBe(false)
  })

  it('matches everything with the root pattern', () => {
    expect(matchesPathPattern('root.anything.at.all', 'root')).toBe(true)
  })

  it('matches everything with a bare wildcard', () => {
    expect(matchesPathPattern('root.anything', '*')).toBe(true)
  })

  it('rejects an empty pattern', () => {
    expect(matchesPathPattern('root.grid', '')).toBe(false)
  })
})

describe('findUnanchoredPattern', () => {
  it('accepts root-anchored and wildcard-anchored patterns', () => {
    expect(
      findUnanchoredPattern(['root.grid', '*.user', 'root.cards.*.title']),
    ).toEqual(Option.none())
  })

  it('flags a pattern missing the root anchor', () => {
    expect(findUnanchoredPattern(['root.grid', 'grid.5'])).toEqual(
      Option.some('grid.5'),
    )
  })

  it('flags an empty pattern', () => {
    expect(findUnanchoredPattern([''])).toEqual(Option.some(''))
  })

  it('accepts an empty pattern list', () => {
    expect(findUnanchoredPattern([])).toEqual(Option.none())
  })
})

describe('matchesAnyPathPattern', () => {
  it('succeeds when any pattern matches', () => {
    expect(
      matchesAnyPathPattern('root.grid.5', ['root.user', 'root.grid']),
    ).toBe(true)
  })

  it('fails when no pattern matches', () => {
    expect(
      matchesAnyPathPattern('root.grid.5', ['root.user', 'root.session']),
    ).toBe(false)
  })
})

describe('collectMatchingEntries', () => {
  const entries = [
    makeEntry('PressedCell', ['root.grid.0.0']),
    makeEntry('EnteredCell', ['root.grid.0.1']),
    makeEntry('UpdatedName', ['root.user.name']),
    makeEntry('SuppressedSpaceScroll'),
  ]

  it('returns all entries with absolute indices when unfiltered', () => {
    const collected = collectMatchingEntries(
      makeState(entries, 100),
      Option.none(),
      Option.none(),
    )

    expect(collected.map(({ index }) => index)).toEqual([100, 101, 102, 103])
  })

  it('drops entries before since index', () => {
    const collected = collectMatchingEntries(
      makeState(entries, 100),
      Option.some(102),
      Option.none(),
    )

    expect(collected.map(({ index }) => index)).toEqual([102, 103])
  })

  it('clamps a since index before the retained range', () => {
    const collected = collectMatchingEntries(
      makeState(entries, 100),
      Option.some(5),
      Option.none(),
    )

    expect(collected.map(({ index }) => index)).toEqual([100, 101, 102, 103])
  })

  it('filters entries by changed path patterns', () => {
    const collected = collectMatchingEntries(
      makeState(entries),
      Option.none(),
      Option.some(['root.grid']),
    )

    expect(collected.map(({ entry }) => entry.tag)).toEqual([
      'PressedCell',
      'EnteredCell',
    ])
  })

  it('never matches entries that did not change the Model', () => {
    const collected = collectMatchingEntries(
      makeState(entries),
      Option.none(),
      Option.some(['root']),
    )

    expect(collected.map(({ entry }) => entry.tag)).not.toContain(
      'SuppressedSpaceScroll',
    )
  })

  it('treats an empty pattern list as no filter', () => {
    const collected = collectMatchingEntries(
      makeState(entries),
      Option.none(),
      Option.some([]),
    )

    expect(collected).toHaveLength(4)
  })
})

describe('pageMatchingEntries', () => {
  const entries = [
    makeEntry('PressedCell', ['root.grid.0.0']),
    makeEntry('UpdatedName', ['root.user.name']),
    makeEntry('EnteredCell', ['root.grid.0.1']),
    makeEntry('EnteredCell', ['root.grid.0.2']),
    makeEntry('ReleasedMouse', ['root.isDrawing']),
  ]
  const gridCandidates = collectMatchingEntries(
    makeState(entries),
    Option.none(),
    Option.some(['root.grid']),
  )

  it('points maybeNextIndex at the next matching entry, skipping gaps', () => {
    const { page, maybeNextIndex } = pageMatchingEntries(
      gridCandidates,
      2,
      false,
    )

    expect(page.map(({ index }) => index)).toEqual([0, 2])
    expect(maybeNextIndex).toEqual(Option.some(3))
  })

  it('resumes from maybeNextIndex without skips or repeats', () => {
    const { maybeNextIndex } = pageMatchingEntries(gridCandidates, 2, false)
    const nextCandidates = collectMatchingEntries(
      makeState(entries),
      maybeNextIndex,
      Option.some(['root.grid']),
    )
    const { page, maybeNextIndex: maybeFinalIndex } = pageMatchingEntries(
      nextCandidates,
      2,
      false,
    )

    expect(page.map(({ index }) => index)).toEqual([3])
    expect(maybeFinalIndex).toEqual(Option.none())
  })

  it('returns None when the page reaches the end of matching history', () => {
    const { maybeNextIndex } = pageMatchingEntries(gridCandidates, 3, false)

    expect(maybeNextIndex).toEqual(Option.none())
  })

  it('returns the final entries in chronological order from the end', () => {
    const { page, maybeNextIndex } = pageMatchingEntries(
      gridCandidates,
      2,
      true,
    )

    expect(page.map(({ index }) => index)).toEqual([2, 3])
    expect(maybeNextIndex).toEqual(Option.none())
  })

  it('clamps a tail read larger than the candidate list', () => {
    const { page } = pageMatchingEntries(gridCandidates, 10, true)

    expect(page.map(({ index }) => index)).toEqual([0, 2, 3])
  })
})

describe('countEntriesByTag', () => {
  it('counts by tag sorted by count descending then tag ascending', () => {
    const collected = collectMatchingEntries(
      makeState([
        makeEntry('EnteredCell', ['root.grid.0.1']),
        makeEntry('EnteredCell', ['root.grid.0.2']),
        makeEntry('PressedCell', ['root.grid.0.0']),
        makeEntry('ReleasedMouse', ['root.isDrawing']),
      ]),
      Option.none(),
      Option.none(),
    )

    expect(countEntriesByTag(collected)).toEqual([
      { tag: 'EnteredCell', count: 2 },
      { tag: 'PressedCell', count: 1 },
      { tag: 'ReleasedMouse', count: 1 },
    ])
  })
})

describe('latestEntryIndex', () => {
  it('returns INIT_INDEX when no entries are retained', () => {
    expect(latestEntryIndex(makeState([]))).toBe(INIT_INDEX)
  })

  it('returns the absolute index of the last entry', () => {
    expect(
      latestEntryIndex(makeState([makeEntry('A'), makeEntry('B')], 30)),
    ).toBe(31)
  })
})

describe('isIndexReadable', () => {
  const state = makeState([makeEntry('A'), makeEntry('B')], 100)

  it('accepts indices inside the retained range', () => {
    expect(isIndexReadable(state, 100)).toBe(true)
    expect(isIndexReadable(state, 101)).toBe(true)
  })

  it('accepts the index just before the oldest retained entry', () => {
    expect(isIndexReadable(state, 99)).toBe(true)
  })

  it('rejects evicted and future indices', () => {
    expect(isIndexReadable(state, 98)).toBe(false)
    expect(isIndexReadable(state, 102)).toBe(false)
  })

  it('accepts INIT_INDEX only once init is recorded', () => {
    expect(isIndexReadable(state, INIT_INDEX)).toBe(true)
    expect(isIndexReadable(makeState([], 0, Option.none()), INIT_INDEX)).toBe(
      false,
    )
  })
})

describe('formatIndexNotReadable', () => {
  it('lists the readable ranges', () => {
    const reason = formatIndexNotReadable(
      makeState([makeEntry('A'), makeEntry('B')], 100),
      98,
    )

    expect(reason).toContain('-1 (init)')
    expect(reason).toContain('99 to 101')
  })

  it('explains when nothing is readable yet', () => {
    const reason = formatIndexNotReadable(makeState([], 0, Option.none()), 5)

    expect(reason).toContain('has not recorded init')
  })
})

describe('pathOrder', () => {
  it('sorts numeric segments numerically', () => {
    const sorted = Array.sort(
      ['root.items.10', 'root.items.2', 'root.items.1'],
      pathOrder,
    )

    expect(sorted).toEqual(['root.items.1', 'root.items.2', 'root.items.10'])
  })

  it('sorts a prefix before its descendants', () => {
    const sorted = Array.sort(['root.grid.5', 'root.grid'], pathOrder)

    expect(sorted).toEqual(['root.grid', 'root.grid.5'])
  })

  it('sorts string segments lexicographically', () => {
    const sorted = Array.sort(['root.user', 'root.cards'], pathOrder)

    expect(sorted).toEqual(['root.cards', 'root.user'])
  })
})

describe('readSummarizedValueAt', () => {
  const model = {
    user: { name: 'Alice' },
    cards: [{ title: 'First' }],
  }

  it('reads the value at a changed path', () => {
    expect(readSummarizedValueAt(model, 'root.user.name')).toEqual(
      Option.some('Alice'),
    )
  })

  it('returns None for a path absent on this side', () => {
    expect(readSummarizedValueAt(model, 'root.cards.1.title')).toEqual(
      Option.none(),
    )
  })

  it('summarizes large values', () => {
    const modelWithLongString = { note: 'x'.repeat(500) }
    const summarized = readSummarizedValueAt(modelWithLongString, 'root.note')

    expect(summarized).toEqual(
      Option.some({
        _summary: 'string',
        length: 500,
        head: 'x'.repeat(200),
      }),
    )
  })
})
