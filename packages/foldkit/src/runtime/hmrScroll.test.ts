import { Effect, Option } from 'effect'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  preserveScrollPosition,
  preservedScrollStorageKey,
  restorePreservedScrollPosition,
  takePreservedScrollPosition,
} from './hmrScroll.js'

const RUNTIME_ID = 'app'

const stubWindowScroll = (x: number, y: number): void => {
  vi.spyOn(window, 'scrollX', 'get').mockReturnValue(x)
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  window.sessionStorage.clear()
})

describe('preserveScrollPosition / takePreservedScrollPosition', () => {
  it('round-trips the captured window offset through sessionStorage', () => {
    stubWindowScroll(120, 340)
    preserveScrollPosition(RUNTIME_ID)

    expect(takePreservedScrollPosition(RUNTIME_ID)).toEqual(
      Option.some({ x: 120, y: 340 }),
    )
  })

  it('clears the stored offset once taken', () => {
    stubWindowScroll(10, 20)
    preserveScrollPosition(RUNTIME_ID)

    takePreservedScrollPosition(RUNTIME_ID)

    expect(
      window.sessionStorage.getItem(preservedScrollStorageKey(RUNTIME_ID)),
    ).toBeNull()
    expect(takePreservedScrollPosition(RUNTIME_ID)).toEqual(Option.none())
  })

  it('returns none when the stored value is not valid JSON', () => {
    window.sessionStorage.setItem(
      preservedScrollStorageKey(RUNTIME_ID),
      'not json',
    )

    expect(takePreservedScrollPosition(RUNTIME_ID)).toEqual(Option.none())
  })

  it('returns none when the stored value is missing a coordinate', () => {
    window.sessionStorage.setItem(
      preservedScrollStorageKey(RUNTIME_ID),
      '{"x":1}',
    )

    expect(takePreservedScrollPosition(RUNTIME_ID)).toEqual(Option.none())
  })

  it('clears a malformed value so it is not retried on a later reload', () => {
    window.sessionStorage.setItem(
      preservedScrollStorageKey(RUNTIME_ID),
      'not json',
    )

    takePreservedScrollPosition(RUNTIME_ID)

    expect(
      window.sessionStorage.getItem(preservedScrollStorageKey(RUNTIME_ID)),
    ).toBeNull()
  })

  it('returns none when nothing was preserved', () => {
    expect(takePreservedScrollPosition(RUNTIME_ID)).toEqual(Option.none())
  })

  it('scopes the stored offset by runtime id', () => {
    stubWindowScroll(5, 6)
    preserveScrollPosition('one')

    expect(takePreservedScrollPosition('two')).toEqual(Option.none())
    expect(takePreservedScrollPosition('one')).toEqual(
      Option.some({ x: 5, y: 6 }),
    )
  })
})

describe('restorePreservedScrollPosition', () => {
  it('scrolls to the preserved offset with an instant jump', () => {
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined)
    window.sessionStorage.setItem(
      preservedScrollStorageKey(RUNTIME_ID),
      '{"x":15,"y":900}',
    )

    Effect.runSync(restorePreservedScrollPosition(RUNTIME_ID))

    expect(scrollTo).toHaveBeenCalledWith({
      left: 15,
      top: 900,
      behavior: 'instant',
    })
  })

  it('does not scroll when nothing was preserved', () => {
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined)

    Effect.runSync(restorePreservedScrollPosition(RUNTIME_ID))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('consumes the offset so a second restore does not scroll again', () => {
    const scrollTo = vi
      .spyOn(window, 'scrollTo')
      .mockImplementation(() => undefined)
    window.sessionStorage.setItem(
      preservedScrollStorageKey(RUNTIME_ID),
      '{"x":15,"y":900}',
    )

    Effect.runSync(restorePreservedScrollPosition(RUNTIME_ID))
    Effect.runSync(restorePreservedScrollPosition(RUNTIME_ID))

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })
})
