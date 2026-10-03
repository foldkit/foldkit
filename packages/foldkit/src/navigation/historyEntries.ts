import { Array, Match, Option, Predicate, Schema, pipe } from 'effect'

import { PredicateExt } from '../effectExtensions/index.js'
import { LoadType } from './loadType.js'
import { ScrollPosition } from './scrollPosition.js'
import { UrlChangeType } from './urlChangeType.js'

/** The most scroll positions kept at once, one per history entry. Recording
 *  another drops the least recently recorded. */
export const MAX_STORED_SCROLL_POSITIONS = 100

const SCROLL_POSITIONS_STORAGE_KEY = 'foldkit:scroll-positions'
const ENTRY_KEY_BYTE_COUNT = 16
const HEXADECIMAL_RADIX = 16
const HEXADECIMAL_BYTE_LENGTH = 2

const HistoryEntryState = Schema.Struct({ foldkitEntryKey: Schema.String })
const decodeHistoryEntryState = Schema.decodeUnknownOption(HistoryEntryState)

const StoredScrollPositions = Schema.fromJsonString(
  Schema.Array(Schema.Tuple([Schema.String, ScrollPosition])),
)
const encodeStoredScrollPositions = Schema.encodeUnknownSync(
  StoredScrollPositions,
)
const decodeStoredScrollPositions = Schema.decodeUnknownOption(
  StoredScrollPositions,
)

type DecodedHistoryState = Readonly<{
  state: unknown
  maybeEntryKey: Option.Option<string>
}>

type RecordedScrollPosition = Readonly<{
  scrollPosition: ScrollPosition
  isPersisted: boolean
}>

let scrollPositionsByEntryKey: Map<string, RecordedScrollPosition> | undefined
let maybeTrackedEntryKey: Option.Option<string> = Option.none()
let lastScrollPosition: ScrollPosition = { x: 0, y: 0 }
let maybePendingBrowserRestoreId: Option.Option<number> = Option.none()
let lastBrowserRestoreId = 0
let lastDecodedHistoryState: DecodedHistoryState | undefined
let isLoadTypeClaimed = false

const isBrowserRestorePending = (): boolean =>
  Option.isSome(maybePendingBrowserRestoreId)

const readStoredScrollPositions = (): Map<string, ScrollPosition> => {
  try {
    return pipe(
      Option.fromNullishOr(
        window.sessionStorage.getItem(SCROLL_POSITIONS_STORAGE_KEY),
      ),
      Option.flatMap(decodeStoredScrollPositions),
      Option.match({
        onNone: () => new Map(),
        onSome: entries =>
          new Map(Array.takeRight(entries, MAX_STORED_SCROLL_POSITIONS)),
      }),
    )
  } catch {
    // NOTE: sessionStorage throws when storage is disabled or blocked by a
    // privacy mode. Stored positions only let a reload report where the reader
    // was, so a failure here reports no position instead of breaking startup.
    return new Map()
  }
}

const scrollPositions = (): Map<string, RecordedScrollPosition> => {
  if (scrollPositionsByEntryKey === undefined) {
    const positions = new Map<string, RecordedScrollPosition>()

    readStoredScrollPositions().forEach((scrollPosition, entryKey) => {
      positions.set(entryKey, { scrollPosition, isPersisted: true })
    })

    scrollPositionsByEntryKey = positions
  }

  return scrollPositionsByEntryKey
}

const setMostRecentScrollPosition = <A>(
  positions: Map<string, A>,
  entryKey: string,
  position: A,
): void => {
  positions.delete(entryKey)
  positions.set(entryKey, position)

  if (positions.size > MAX_STORED_SCROLL_POSITIONS) {
    const maybeLeastRecentEntryKey = Option.fromNullishOr(
      positions.keys().next().value,
    )

    if (Option.isSome(maybeLeastRecentEntryKey)) {
      positions.delete(maybeLeastRecentEntryKey.value)
    }
  }
}

const recordScrollPosition = (
  entryKey: string,
  scrollPosition: ScrollPosition,
): void => {
  setMostRecentScrollPosition(scrollPositions(), entryKey, {
    scrollPosition,
    isPersisted: false,
  })
}

// NOTE: every same-origin document in a tab shares its sessionStorage, and a
// document kept in the back/forward cache writes it again on each `pagehide`.
// Writing the whole map would put back positions this document read at load
// over newer ones another document wrote since, so it writes only the entries
// it recorded since its last write, over what is stored now.
const persistScrollPositions = (): void => {
  const positions = scrollPositions()
  const nextStoredPositions = readStoredScrollPositions()

  positions.forEach(({ scrollPosition, isPersisted }, entryKey) => {
    if (!isPersisted) {
      setMostRecentScrollPosition(nextStoredPositions, entryKey, scrollPosition)
    }
  })

  try {
    window.sessionStorage.setItem(
      SCROLL_POSITIONS_STORAGE_KEY,
      encodeStoredScrollPositions(Array.fromIterable(nextStoredPositions)),
    )

    positions.forEach(({ scrollPosition }, entryKey) => {
      positions.set(entryKey, { scrollPosition, isPersisted: true })
    })
  } catch {
    // NOTE: sessionStorage throws when storage is disabled, blocked by a
    // privacy mode, or full. This runs while the page unloads, so a failure
    // only means the next load reports no position.
  }
}

const storedScrollPosition = (
  entryKey: string,
): Option.Option<ScrollPosition> =>
  Option.map(
    Option.fromNullishOr(scrollPositions().get(entryKey)),
    ({ scrollPosition }) => scrollPosition,
  )

const liveScrollPosition = (): ScrollPosition => ({
  x: window.scrollX,
  y: window.scrollY,
})

const createEntryKey = (): string =>
  pipe(
    crypto.getRandomValues(new Uint8Array(ENTRY_KEY_BYTE_COUNT)),
    Array.fromIterable,
    Array.map(byte =>
      byte.toString(HEXADECIMAL_RADIX).padStart(HEXADECIMAL_BYTE_LENGTH, '0'),
    ),
    Array.join(''),
  )

const entryKeyFromState = (state: unknown): Option.Option<string> =>
  Option.map(
    decodeHistoryEntryState(state),
    ({ foldkitEntryKey }) => foldkitEntryKey,
  )

// NOTE: `history.state` returns the same object until an entry is pushed,
// replaced, or traversed to.
const entryKeyInHistoryState = (): Option.Option<string> => {
  const state: unknown = window.history.state

  if (
    lastDecodedHistoryState === undefined ||
    lastDecodedHistoryState.state !== state
  ) {
    lastDecodedHistoryState = { state, maybeEntryKey: entryKeyFromState(state) }
  }

  return lastDecodedHistoryState.maybeEntryKey
}

const stampCurrentEntry = (state: unknown): string => {
  const entryKey = createEntryKey()
  const nextState = PredicateExt.isPlainObject(state)
    ? { ...state, foldkitEntryKey: entryKey }
    : { foldkitEntryKey: entryKey }

  window.history.replaceState(nextState, '')

  return entryKey
}

const entryKeyOrStamp = (state: unknown): string =>
  Option.getOrElse(entryKeyFromState(state), () => stampCurrentEntry(state))

// NOTE: another script can push or replace a history entry without Foldkit
// seeing it, for example a dialog library that pushes `#modal`. Because this
// runs on every scroll event, the last one still holds where the reader was
// on the entry they left.
const followCurrentEntry = (): void => {
  const maybeEntryKey = entryKeyInHistoryState()

  if (
    !isBrowserRestorePending() &&
    Option.isSome(maybeTrackedEntryKey) &&
    !Option.contains(maybeEntryKey, maybeTrackedEntryKey.value)
  ) {
    recordScrollPosition(maybeTrackedEntryKey.value, lastScrollPosition)
  }

  maybeTrackedEntryKey = maybeEntryKey
}

// NOTE: after a load or a traversal the browser may still apply its own scroll
// restoration, which Chromium holds until layout allows it. Reading
// `window.scrollY` in that window forces the layout early, so Chromium applies
// the restore against the page still on screen and cuts the position short.
// Scroll events are therefore not read again until the resume that
// `pendingScrollReadResume` returns runs, one frame after the render that shows
// the arrived entry, and a single read then catches up. Until then the last
// position read belongs to an earlier entry, so an entry left by a traversal or
// by another script keeps the position it has. Only `pushUrl` reads inside that
// window, because it leaves the entry at once.
const markBrowserRestorePending = (): void => {
  lastBrowserRestoreId += 1
  maybePendingBrowserRestoreId = Option.some(lastBrowserRestoreId)
}

const clearPendingBrowserRestore = (): void => {
  maybePendingBrowserRestoreId = Option.none()
}

const resumeScrollReads = (browserRestoreId: number): void => {
  if (!Option.contains(maybePendingBrowserRestoreId, browserRestoreId)) {
    return
  }

  followCurrentEntry()
  clearPendingBrowserRestore()
  lastScrollPosition = liveScrollPosition()
}

/** Returns the function to call once the browser restore pending after startup
 *  or the latest traversal has settled. It resumes reading scroll events and
 *  reads the window's scroll position once. Returns `Option.none()` when no
 *  restore is pending. The function does nothing when a later traversal, a
 *  `pushUrl`, or the end of tracking has replaced that restore by the time it
 *  runs. */
export const pendingScrollReadResume = (): Option.Option<() => void> =>
  Option.map(
    maybePendingBrowserRestoreId,
    browserRestoreId => () => resumeScrollReads(browserRestoreId),
  )

/** Starts tracking the current history entry. Gives the entry a key if it has
 *  none, follows the window's scroll position once the resume from
 *  `pendingScrollReadResume` reports that the browser restore of the load has
 *  settled, and saves the positions it recorded to `sessionStorage` on
 *  `pagehide` and when tracking stops, leaving the positions other documents
 *  in the tab saved in place. Returns the function that stops tracking. */
export const startHistoryEntryTracking = (): (() => void) => {
  maybeTrackedEntryKey = Option.some(entryKeyOrStamp(window.history.state))
  markBrowserRestorePending()

  const onScroll = (): void => {
    if (isBrowserRestorePending()) {
      return
    }

    followCurrentEntry()
    lastScrollPosition = liveScrollPosition()
  }

  const onPageHide = (): void => {
    if (!isBrowserRestorePending()) {
      recordScrollPosition(currentEntryKey(), liveScrollPosition())
    }

    persistScrollPositions()
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', onPageHide)

  // NOTE: on a `pagehide` that does not put the page into the back/forward
  // cache, the teardown of `run` and `hydrate` runs first and removes the
  // listener above, which the browser then skips. So stopping records and
  // persists the position itself, taken from the last scroll event because
  // the teardown has already emptied the container.
  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', onPageHide)

    if (!isBrowserRestorePending()) {
      recordScrollPosition(currentEntryKey(), lastScrollPosition)
    }

    persistScrollPositions()
    clearPendingBrowserRestore()
  }
}

/** The key of the entry the browser is on. Gives the entry a key when it has
 *  none, which an entry another script pushed or replaced may lack. */
export const currentEntryKey = (): string => {
  followCurrentEntry()

  const entryKey = Option.getOrElse(maybeTrackedEntryKey, () =>
    stampCurrentEntry(window.history.state),
  )

  maybeTrackedEntryKey = Option.some(entryKey)

  return entryKey
}

/** Records the window's scroll position for the entry being left, and returns
 *  the key for the entry `pushUrl` is about to create. The new entry starts at
 *  that position, so it is also the position the tracker holds for it until
 *  the next scroll event. */
export const recordLeavingEntryAndCreateKey = (): string => {
  const leavingEntryKey = currentEntryKey()

  lastScrollPosition = liveScrollPosition()
  recordScrollPosition(leavingEntryKey, lastScrollPosition)
  clearPendingBrowserRestore()

  const entryKey = createEntryKey()

  maybeTrackedEntryKey = Option.some(entryKey)

  return entryKey
}

/** Records the scroll position of the entry being left and describes the
 *  entry a `popstate` arrived at. The position comes from the last `scroll`
 *  event, and an entry without a key is given one. */
export const recordLeavingEntryAndTraverse = (
  state: unknown,
): UrlChangeType => {
  // NOTE: Chromium applies its own scroll restoration before `popstate`
  // fires, so `window.scrollY` already belongs to the entry being arrived at.
  // The `scroll` event for that restore has not fired yet, which is why the
  // last one still holds where the reader was on the entry being left.
  if (!isBrowserRestorePending() && Option.isSome(maybeTrackedEntryKey)) {
    recordScrollPosition(maybeTrackedEntryKey.value, lastScrollPosition)
  }

  const entryKey = entryKeyOrStamp(state)

  maybeTrackedEntryKey = Option.some(entryKey)
  markBrowserRestorePending()

  return UrlChangeType.Traverse({
    maybeSavedScrollPosition: storedScrollPosition(entryKey),
  })
}

const navigationTimingType = (
  entry: PerformanceEntry,
): Option.Option<string> =>
  Predicate.hasProperty(entry, 'type') && Predicate.isString(entry.type)
    ? Option.some(entry.type)
    : Option.none()

const initialLoadType = (): LoadType => {
  const maybeSavedScrollPosition = Option.flatMap(
    entryKeyInHistoryState(),
    storedScrollPosition,
  )

  return pipe(
    performance.getEntriesByType('navigation'),
    Array.head,
    Option.flatMap(navigationTimingType),
    Option.match({
      onNone: () => LoadType.Push(),
      onSome: type =>
        Match.value(type).pipe(
          Match.withReturnType<LoadType>(),
          Match.when('reload', () =>
            LoadType.Reload({ maybeSavedScrollPosition }),
          ),
          Match.when('back_forward', () =>
            LoadType.Traverse({ maybeSavedScrollPosition }),
          ),
          Match.orElse(() => LoadType.Push()),
        ),
    }),
  )
}

/** Describes how the reader arrived at the page for a routing application
 *  whose `init` is running or which restores a preserved Model instead. The
 *  first such start in a page gets how the document was loaded: `Reload` for
 *  a reload, `Traverse` for Back or Forward into the document, and `Push` for
 *  anything else, with Reload and Traverse carrying the stored position of
 *  the current entry. Every later start in the same page, of this application
 *  or another, such as an embed after a dispose, gets `Push`, because the
 *  document was not loaded again. */
export const claimLoadType = (): LoadType => {
  if (isLoadTypeClaimed) {
    return LoadType.Push()
  } else {
    isLoadTypeClaimed = true

    return initialLoadType()
  }
}
