import { Array, Option } from 'effect'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  entryKeyInHistoryState,
  expectWorkingSessionStorage,
  replaceSessionStorage,
  reportNavigationTimingType,
  scrollWindowTo,
} from '../test/support/navigation.js'
import { LoadType } from './loadType.js'
import { UrlChangeType } from './urlChangeType.js'

const SCROLL_POSITIONS_STORAGE_KEY = 'foldkit:scroll-positions'

type HistoryEntries = typeof import('./historyEntries.js')

// NOTE: the tracker keeps its positions in module state, the way a page keeps
// them until it unloads. Importing a fresh copy of the module is how these
// tests stand for a reload: the only positions the new copy can find are the
// ones written to sessionStorage.
const loadHistoryEntries = async (): Promise<HistoryEntries> => {
  vi.resetModules()
  return import('./historyEntries.js')
}

const settleStartup = (historyEntries: HistoryEntries): void => {
  const maybeResume = historyEntries.pendingScrollReadResume()

  if (Option.isSome(maybeResume)) {
    maybeResume.value()
  }
}

const traverseTo = (
  historyEntries: HistoryEntries,
  state: unknown,
): UrlChangeType => {
  window.history.replaceState(state, '', '/')
  return historyEntries.recordLeavingEntryAndTraverse(state)
}

const pushEntry = (historyEntries: HistoryEntries): string => {
  const entryKey = historyEntries.recordLeavingEntryAndCreateKey()
  window.history.pushState({ foldkitEntryKey: entryKey }, '', '/')
  return entryKey
}

const storedEntryKeys = (): ReadonlyArray<string> => {
  const storedEntries: ReadonlyArray<Readonly<[string, unknown]>> = JSON.parse(
    window.sessionStorage.getItem(SCROLL_POSITIONS_STORAGE_KEY) ?? '[]',
  )

  return Array.map(storedEntries, ([entryKey]) => entryKey)
}

let stopTracking = (): void => {}

beforeEach(() => {
  window.sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  stopTracking()
  stopTracking = () => {}
  vi.restoreAllMocks()
  expectWorkingSessionStorage()
  window.sessionStorage.clear()
})

describe('startHistoryEntryTracking', () => {
  it('gives an entry without a key one, keeping the rest of its state', async () => {
    window.history.replaceState({ scrollOwner: 'host' }, '', '/')
    const historyEntries = await loadHistoryEntries()

    stopTracking = historyEntries.startHistoryEntryTracking()

    expect(window.history.state).toEqual({
      scrollOwner: 'host',
      foldkitEntryKey: expect.any(String),
    })
  })

  it('keeps the key an entry already has', async () => {
    window.history.replaceState({ foldkitEntryKey: 'existing' }, '', '/')
    const historyEntries = await loadHistoryEntries()

    stopTracking = historyEntries.startHistoryEntryTracking()

    expect(window.history.state).toEqual({ foldkitEntryKey: 'existing' })
    expect(historyEntries.currentEntryKey()).toBe('existing')
  })
})

describe('stored scroll positions', () => {
  it('keeps at most MAX_STORED_SCROLL_POSITIONS, dropping the least recently written', async () => {
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    const writeCount = historyEntries.MAX_STORED_SCROLL_POSITIONS + 5

    const writtenKeys = Array.makeBy(writeCount, () =>
      pushEntry(historyEntries),
    )
    window.dispatchEvent(new Event('pagehide'))

    const storedKeys = storedEntryKeys()
    expect(storedKeys).toEqual(
      Array.takeRight(writtenKeys, historyEntries.MAX_STORED_SCROLL_POSITIONS),
    )
  })

  it('keeps an entry recorded again as the most recently written', async () => {
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    const firstEntryKey = historyEntries.currentEntryKey()
    const pushedKeys = Array.makeBy(
      historyEntries.MAX_STORED_SCROLL_POSITIONS - 1,
      () => pushEntry(historyEntries),
    )

    window.history.replaceState({ foldkitEntryKey: firstEntryKey }, '', '/')
    historyEntries.recordLeavingEntryAndTraverse(window.history.state)
    pushEntry(historyEntries)
    pushEntry(historyEntries)
    window.dispatchEvent(new Event('pagehide'))

    const storedKeys = storedEntryKeys()
    expect(storedKeys).toHaveLength(historyEntries.MAX_STORED_SCROLL_POSITIONS)
    expect(storedKeys).toContain(firstEntryKey)
    expect(storedKeys).not.toContain(Array.headNonEmpty(pushedKeys))
  })

  it('keeps at most MAX_STORED_SCROLL_POSITIONS of the positions stored before the load', async () => {
    const historyEntries = await loadHistoryEntries()
    const seededKeys = Array.makeBy(
      historyEntries.MAX_STORED_SCROLL_POSITIONS + 5,
      index => `seeded-${index}`,
    )
    window.sessionStorage.setItem(
      SCROLL_POSITIONS_STORAGE_KEY,
      JSON.stringify(
        Array.map(seededKeys, entryKey => [entryKey, { x: 0, y: 0 }]),
      ),
    )
    stopTracking = historyEntries.startHistoryEntryTracking()
    settleStartup(historyEntries)

    const currentEntryKey = historyEntries.currentEntryKey()
    window.dispatchEvent(new Event('pagehide'))

    expect(storedEntryKeys()).toEqual([
      ...Array.takeRight(
        seededKeys,
        historyEntries.MAX_STORED_SCROLL_POSITIONS - 1,
      ),
      currentEntryKey,
    ])
  })

  it('keeps the positions another document in the tab stored since this one loaded', async () => {
    const firstDocument = await loadHistoryEntries()
    let stopFirstDocument = firstDocument.startHistoryEntryTracking()
    settleStartup(firstDocument)
    const firstDocumentState = window.history.state
    scrollWindowTo(0, 1000)
    stopFirstDocument()

    window.history.pushState(null, '', '/second')
    const secondDocument = await loadHistoryEntries()
    let stopSecondDocument = secondDocument.startHistoryEntryTracking()
    settleStartup(secondDocument)
    const secondDocumentState = window.history.state
    scrollWindowTo(0, 500)
    stopSecondDocument()

    window.history.replaceState(firstDocumentState, '', '/')
    stopFirstDocument = firstDocument.startHistoryEntryTracking()
    settleStartup(firstDocument)
    scrollWindowTo(0, 2000)
    stopFirstDocument()

    window.history.replaceState(secondDocumentState, '', '/second')
    stopSecondDocument = secondDocument.startHistoryEntryTracking()
    settleStartup(secondDocument)
    scrollWindowTo(0, 500)
    stopSecondDocument()

    window.history.replaceState(firstDocumentState, '', '/')
    reportNavigationTimingType('reload')
    const afterReload = await loadHistoryEntries()

    expect(storedEntryKeys()).toHaveLength(2)
    expect(afterReload.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 2000 }),
      }),
    )
  })

  it('writes again only the positions recorded since its last write', async () => {
    const firstDocument = await loadHistoryEntries()
    let stopFirstDocument = firstDocument.startHistoryEntryTracking()
    settleStartup(firstDocument)
    const firstEntryKey = firstDocument.currentEntryKey()
    const secondEntryKey = pushEntry(firstDocument)
    stopFirstDocument()

    window.history.pushState(null, '', '/second')
    const secondDocument = await loadHistoryEntries()
    const stopSecondDocument = secondDocument.startHistoryEntryTracking()
    settleStartup(secondDocument)
    const thirdEntryKey = secondDocument.currentEntryKey()
    stopSecondDocument()

    window.history.replaceState({ foldkitEntryKey: secondEntryKey }, '', '/')
    stopFirstDocument = firstDocument.startHistoryEntryTracking()
    settleStartup(firstDocument)
    stopFirstDocument()

    expect(storedEntryKeys()).toEqual([
      firstEntryKey,
      thirdEntryKey,
      secondEntryKey,
    ])
  })

  it('finds the position of the current entry after a reload', async () => {
    const beforeReload = await loadHistoryEntries()
    stopTracking = beforeReload.startHistoryEntryTracking()
    settleStartup(beforeReload)
    scrollWindowTo(0, 640)
    window.dispatchEvent(new Event('pagehide'))

    reportNavigationTimingType('reload')
    const afterReload = await loadHistoryEntries()

    expect(afterReload.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 640 }),
      }),
    )
  })

  it('saves the position from the last scroll event when tracking stops before pagehide reaches it', async () => {
    const beforeReload = await loadHistoryEntries()
    stopTracking = beforeReload.startHistoryEntryTracking()
    settleStartup(beforeReload)
    scrollWindowTo(0, 1800)
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
    stopTracking()
    stopTracking = () => {}

    reportNavigationTimingType('reload')
    const afterReload = await loadHistoryEntries()

    expect(afterReload.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 1800 }),
      }),
    )
  })
})

describe('entries another script created', () => {
  it('saves the position under the key of the entry the browser is on when tracking stops', async () => {
    const beforeReload = await loadHistoryEntries()
    stopTracking = beforeReload.startHistoryEntryTracking()
    settleStartup(beforeReload)
    scrollWindowTo(0, 1000)
    window.history.pushState(null, '', '/#modal')
    scrollWindowTo(0, 3000)
    stopTracking()
    stopTracking = () => {}

    reportNavigationTimingType('reload')
    const afterReload = await loadHistoryEntries()

    expect(afterReload.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 3000 }),
      }),
    )
  })
})

describe('unloading while a browser restore may be pending', () => {
  it('keeps the stored position of the current entry on pagehide', async () => {
    const firstLoad = await loadHistoryEntries()
    stopTracking = firstLoad.startHistoryEntryTracking()
    settleStartup(firstLoad)
    scrollWindowTo(0, 640)
    stopTracking()

    const secondLoad = await loadHistoryEntries()
    stopTracking = secondLoad.startHistoryEntryTracking()
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
    window.dispatchEvent(new Event('pagehide'))

    reportNavigationTimingType('reload')
    const thirdLoad = await loadHistoryEntries()

    expect(thirdLoad.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 640 }),
      }),
    )
  })

  it('keeps the stored position of the current entry when tracking stops', async () => {
    const firstLoad = await loadHistoryEntries()
    stopTracking = firstLoad.startHistoryEntryTracking()
    settleStartup(firstLoad)
    scrollWindowTo(0, 640)
    stopTracking()

    const secondLoad = await loadHistoryEntries()
    stopTracking = secondLoad.startHistoryEntryTracking()
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(0)
    stopTracking()
    stopTracking = () => {}

    reportNavigationTimingType('reload')
    const thirdLoad = await loadHistoryEntries()

    expect(thirdLoad.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 640 }),
      }),
    )
  })
})

describe('browser restores', () => {
  it('hands out no resume when no restore is pending', async () => {
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    settleStartup(historyEntries)

    expect(historyEntries.pendingScrollReadResume()).toEqual(Option.none())
  })

  it('ignores a resume for a restore that a later traversal replaced', async () => {
    window.history.replaceState({ foldkitEntryKey: 'first' }, '', '/')
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    const resumeAfterStartup = Option.getOrThrow(
      historyEntries.pendingScrollReadResume(),
    )

    traverseTo(historyEntries, { foldkitEntryKey: 'second' })
    resumeAfterStartup()
    scrollWindowTo(0, 700)
    traverseTo(historyEntries, { foldkitEntryKey: 'first' })

    expect(traverseTo(historyEntries, { foldkitEntryKey: 'second' })).toEqual(
      UrlChangeType.Traverse({ maybeSavedScrollPosition: Option.none() }),
    )
  })

  it('ends a pending restore when pushUrl leaves the entry', async () => {
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    const firstEntryState = window.history.state

    const pushedEntryKey = pushEntry(historyEntries)
    scrollWindowTo(0, 300)
    traverseTo(historyEntries, firstEntryState)

    expect(
      traverseTo(historyEntries, { foldkitEntryKey: pushedEntryKey }),
    ).toEqual(
      UrlChangeType.Traverse({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 300 }),
      }),
    )
  })
})

describe('claimLoadType', () => {
  it('reports Traverse with the stored position for a back_forward navigation', async () => {
    const beforeLeaving = await loadHistoryEntries()
    stopTracking = beforeLeaving.startHistoryEntryTracking()
    settleStartup(beforeLeaving)
    scrollWindowTo(0, 900)
    window.dispatchEvent(new Event('pagehide'))
    stopTracking()
    stopTracking = () => {}

    reportNavigationTimingType('back_forward')
    const afterReturning = await loadHistoryEntries()

    expect(afterReturning.claimLoadType()).toEqual(
      LoadType.Traverse({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 900 }),
      }),
    )
  })

  it('reports Push for a navigate navigation', async () => {
    reportNavigationTimingType('navigate')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(LoadType.Push())
  })

  it('reports Push when the browser has no navigation timing entry', async () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(LoadType.Push())
  })

  it('reports Reload without a position for an entry that has no key', async () => {
    reportNavigationTimingType('reload')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(
      LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
    )
  })

  it('reports Push to every claim after the first in a page', async () => {
    window.history.replaceState({ foldkitEntryKey: 'entry' }, '', '/')
    window.sessionStorage.setItem(
      SCROLL_POSITIONS_STORAGE_KEY,
      JSON.stringify([['entry', { x: 0, y: 500 }]]),
    )
    reportNavigationTimingType('reload')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(
      LoadType.Reload({
        maybeSavedScrollPosition: Option.some({ x: 0, y: 500 }),
      }),
    )
    expect(historyEntries.claimLoadType()).toEqual(LoadType.Push())
    expect(historyEntries.claimLoadType()).toEqual(LoadType.Push())
  })
})

describe('sessionStorage failures', () => {
  it('treats malformed stored positions as absent', async () => {
    window.history.replaceState({ foldkitEntryKey: 'entry' }, '', '/')
    window.sessionStorage.setItem(SCROLL_POSITIONS_STORAGE_KEY, 'not json')
    reportNavigationTimingType('reload')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(
      LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
    )
  })

  it('treats stored positions of the wrong shape as absent', async () => {
    window.history.replaceState({ foldkitEntryKey: 'entry' }, '', '/')
    window.sessionStorage.setItem(
      SCROLL_POSITIONS_STORAGE_KEY,
      JSON.stringify([['entry', { x: 0 }]]),
    )
    reportNavigationTimingType('reload')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(
      LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
    )
  })

  it('never throws when sessionStorage throws, and still reports traversals', async () => {
    const storageError = new Error('storage is blocked')
    replaceSessionStorage({
      getItem: () => {
        throw storageError
      },
      setItem: () => {
        throw storageError
      },
    })
    window.history.replaceState({ foldkitEntryKey: 'entry' }, '', '/')
    reportNavigationTimingType('reload')
    const historyEntries = await loadHistoryEntries()

    expect(historyEntries.claimLoadType()).toEqual(
      LoadType.Reload({ maybeSavedScrollPosition: Option.none() }),
    )

    stopTracking = historyEntries.startHistoryEntryTracking()
    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow()
    expect(historyEntries.recordLeavingEntryAndTraverse(null)).toEqual(
      UrlChangeType.Traverse({ maybeSavedScrollPosition: Option.none() }),
    )
    expect(entryKeyInHistoryState()).toEqual(expect.any(String))
  })

  it('writes the positions a failed write left out on the next write', async () => {
    const storage = window.sessionStorage
    let isStorageFull = true
    replaceSessionStorage({
      getItem: key => storage.getItem(key),
      setItem: (key, value) => {
        if (isStorageFull) {
          throw new Error('storage is full')
        }

        storage.setItem(key, value)
      },
    })
    const historyEntries = await loadHistoryEntries()
    stopTracking = historyEntries.startHistoryEntryTracking()
    settleStartup(historyEntries)

    const firstEntryKey = historyEntries.currentEntryKey()
    const secondEntryKey = pushEntry(historyEntries)
    window.dispatchEvent(new Event('pagehide'))

    isStorageFull = false
    stopTracking()
    stopTracking = () => {}

    expect(storedEntryKeys()).toEqual([firstEntryKey, secondEntryKey])
  })
})
