import { describe, it } from '@effect/vitest'
import { DateTime, Effect } from 'effect'
import { expect } from 'vitest'

import {
  ElementNotFound,
  TimeZoneError,
  focus,
  getTime,
  getTimeZone,
  getZonedTime,
  getZonedTimeIn,
  inertOthers,
  lockScroll,
  randomInt,
  restoreInert,
  unlockScroll,
  uuid,
} from './index.js'

describe('getTime', () => {
  it.effect('returns a UTC time', () =>
    Effect.gen(function* () {
      const utc = yield* getTime
      expect(DateTime.isUtc(utc)).toBe(true)
    }),
  )
})

describe('getTimeZone', () => {
  it.effect('returns a timezone', () =>
    Effect.gen(function* () {
      const zone = yield* getTimeZone
      expect(DateTime.isTimeZone(zone)).toBe(true)
    }),
  )
})

describe('getZonedTime', () => {
  it.effect('returns a zoned datetime', () =>
    Effect.gen(function* () {
      const zoned = yield* getZonedTime
      expect(DateTime.isZoned(zoned)).toBe(true)
    }),
  )
})

describe('getZonedTimeIn', () => {
  it.effect('succeeds with a valid timezone', () =>
    Effect.gen(function* () {
      const zoned = yield* getZonedTimeIn('America/New_York')
      expect(DateTime.isZoned(zoned)).toBe(true)
    }),
  )

  it.effect('fails with an invalid timezone', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(getZonedTimeIn('Invalid/Zone'))
      expect(error).toBeInstanceOf(TimeZoneError)
      expect(error.zoneId).toBe('Invalid/Zone')
    }),
  )
})

describe('randomInt', () => {
  it.effect('produces a value within the specified range', () =>
    Effect.gen(function* () {
      const results: Array<number> = []
      for (let index = 0; index < 50; index++) {
        const result = yield* randomInt(0, 10)
        results.push(result)
      }
      for (const result of results) {
        expect(result).toBeGreaterThanOrEqual(0)
        expect(result).toBeLessThan(10)
      }
    }),
  )

  it.effect('returns the raw number value', () =>
    Effect.gen(function* () {
      const value = yield* randomInt(5, 15)
      expect(value).toBeGreaterThanOrEqual(5)
      expect(value).toBeLessThan(15)
    }),
  )
})

describe('uuid', () => {
  it.effect('returns a RFC 4122 v4 UUID string', () =>
    Effect.gen(function* () {
      const value = yield* uuid
      expect(value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
    }),
  )

  it.effect('produces a distinct value on each call', () =>
    Effect.gen(function* () {
      const first = yield* uuid
      const second = yield* uuid
      expect(first).not.toBe(second)
    }),
  )
})

describe('focus', () => {
  it.effect('fails with ElementNotFound when element is not found', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(focus('#nonexistent'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#nonexistent')
    }),
  )
})

describe('lockScroll', () => {
  it.effect('sets overflow hidden on document element', () =>
    Effect.gen(function* () {
      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
    }),
  )

  it.effect('restores original overflow on unlock', () =>
    Effect.gen(function* () {
      document.documentElement.style.overflow = 'auto'

      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('auto')

      document.documentElement.style.overflow = ''
    }),
  )

  it.effect('supports nested locks via reference counting', () =>
    Effect.gen(function* () {
      yield* lockScroll
      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('')
    }),
  )
})

describe('unlockScroll', () => {
  it.effect('is safe to call without a preceding lock', () =>
    Effect.gen(function* () {
      yield* unlockScroll
    }),
  )
})

describe('inertOthers', () => {
  const buildDom = () => {
    const header = document.createElement('header')
    const main = document.createElement('main')
    const sidebar = document.createElement('div')
    sidebar.id = 'sidebar'
    const content = document.createElement('div')
    content.id = 'content'
    const button = document.createElement('button')
    button.id = 'menu-button'
    const items = document.createElement('div')
    items.id = 'menu-items'
    const footer = document.createElement('footer')

    content.appendChild(button)
    content.appendChild(items)
    main.appendChild(sidebar)
    main.appendChild(content)
    document.body.appendChild(header)
    document.body.appendChild(main)
    document.body.appendChild(footer)

    return { header, main, sidebar, content, button, items, footer }
  }

  const cleanupDom = () => {
    document.body.innerHTML = ''
  }

  it.effect('marks siblings of allowed elements as inert', () =>
    Effect.gen(function* () {
      const { header, main, sidebar, content, button, items, footer } =
        buildDom()

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.inert).toBe(true)
      expect(header.getAttribute('aria-hidden')).toBe('true')
      expect(footer.inert).toBe(true)
      expect(footer.getAttribute('aria-hidden')).toBe('true')
      expect(sidebar.inert).toBe(true)
      expect(sidebar.getAttribute('aria-hidden')).toBe('true')

      expect(main.inert).toBeFalsy()
      expect(content.inert).toBeFalsy()
      expect(button.inert).toBeFalsy()
      expect(items.inert).toBeFalsy()

      yield* restoreInert('test')
      cleanupDom()
    }),
  )

  it.effect('restores original values', () =>
    Effect.gen(function* () {
      const { header, footer } = buildDom()
      header.setAttribute('aria-hidden', 'false')

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('test')

      expect(header.getAttribute('aria-hidden')).toBe('false')
      expect(footer.getAttribute('aria-hidden')).toBeNull()

      cleanupDom()
    }),
  )

  it.effect('removes aria-hidden when original was null', () =>
    Effect.gen(function* () {
      const { header } = buildDom()
      expect(header.getAttribute('aria-hidden')).toBeNull()

      yield* inertOthers('test', ['#menu-button', '#menu-items'])

      expect(header.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('test')

      expect(header.getAttribute('aria-hidden')).toBeNull()

      cleanupDom()
    }),
  )

  it.effect('supports nested locks via reference counting', () =>
    Effect.gen(function* () {
      const { header } = buildDom()

      yield* inertOthers('first', ['#menu-button', '#menu-items'])
      yield* inertOthers('second', ['#menu-button', '#menu-items'])

      expect(header.inert).toBe(true)

      yield* restoreInert('first')
      expect(header.inert).toBe(true)

      yield* restoreInert('second')
      expect(header.inert).toBeFalsy()

      cleanupDom()
    }),
  )

  it.effect('handles missing selectors gracefully', () =>
    Effect.gen(function* () {
      buildDom()

      yield* inertOthers('test', ['#nonexistent', '#also-missing'])

      yield* restoreInert('test')
      cleanupDom()
    }),
  )
})

describe('restoreInert', () => {
  it.effect('is safe to call without a preceding inertOthers', () =>
    Effect.gen(function* () {
      yield* restoreInert('nonexistent')
    }),
  )
})
