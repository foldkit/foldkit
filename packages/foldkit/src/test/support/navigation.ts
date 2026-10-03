import { type MockInstance, expect, vi } from 'vitest'

const STORAGE_CHECK_KEY = 'storage-check'
const STORAGE_CHECK_VALUE = 'available'

// NOTE: happy-dom's Storage copies each method onto the instance the first
// time it is read, so a spy on `sessionStorage` or on `Storage.prototype`
// outlives `vi.restoreAllMocks()`. The tests replace the `window.sessionStorage`
// getter instead, which restores like any other spy.
export const replaceSessionStorage = (
  methods: Pick<Storage, 'getItem' | 'setItem'>,
): MockInstance<() => Storage> =>
  vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue({
    length: 0,
    clear: () => {},
    key: () => null,
    removeItem: () => {},
    ...methods,
  })

export const expectWorkingSessionStorage = (): void => {
  window.sessionStorage.setItem(STORAGE_CHECK_KEY, STORAGE_CHECK_VALUE)
  expect(window.sessionStorage.getItem(STORAGE_CHECK_KEY)).toBe(
    STORAGE_CHECK_VALUE,
  )
}

export const scrollWindowTo = (x: number, y: number): void => {
  vi.spyOn(window, 'scrollX', 'get').mockReturnValue(x)
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
  window.dispatchEvent(new Event('scroll'))
}

export const reportNavigationTimingType = (type: string): void => {
  const navigationTiming = {
    duration: 0,
    entryType: 'navigation',
    name: window.location.href,
    startTime: 0,
    toJSON: () => ({}),
    type,
  }
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([navigationTiming])
}

export const nextAnimationFrame = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => resolve())
  })

export const entryKeyInHistoryState = (): unknown =>
  Reflect.get(Object(window.history.state), 'foldkitEntryKey')
