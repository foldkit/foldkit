import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'
import { expect, vi } from 'vitest'

import {
  ElementNotFound,
  focus,
  inertOthers,
  lockScroll,
  restoreInert,
  scrollIntoView,
  scrollIntoViewAfterPaint,
  unlockScroll,
} from './index.js'

describe('focus', () => {
  it.effect('fails with ElementNotFound when element is not found', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(focus('#nonexistent'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#nonexistent')
    }),
  )

  it.effect('focuses the matching element', () =>
    Effect.gen(function* () {
      const input = document.createElement('input')
      input.id = 'target'
      document.body.appendChild(input)

      yield* focus('#target')

      expect(document.activeElement).toBe(input)

      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'injects tabindex="-1" when makeFocusable is true and the target has none',
    () =>
      Effect.gen(function* () {
        const section = document.createElement('section')
        section.id = 'target'
        document.body.appendChild(section)

        yield* focus('#target', { makeFocusable: true })

        expect(section.getAttribute('tabindex')).toBe('-1')
        expect(document.activeElement).toBe(section)

        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'leaves an existing tabindex untouched when makeFocusable is true',
    () =>
      Effect.gen(function* () {
        const section = document.createElement('section')
        section.id = 'target'
        section.setAttribute('tabindex', '0')
        document.body.appendChild(section)

        yield* focus('#target', { makeFocusable: true })

        expect(section.getAttribute('tabindex')).toBe('0')

        document.body.innerHTML = ''
      }),
  )

  it.effect('forwards preventScroll to the focus call', () =>
    Effect.gen(function* () {
      const input = document.createElement('input')
      input.id = 'target'
      document.body.appendChild(input)

      const focusSpy = vi.fn()
      input.focus = focusSpy

      yield* focus('#target', { preventScroll: true })

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })

      document.body.innerHTML = ''
    }),
  )
})

describe('scrollIntoView', () => {
  it.effect('fails with ElementNotFound when the selector does not match', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(scrollIntoView('#missing'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#missing')
    }),
  )

  it.effect('defaults to { block: "nearest" }', () =>
    Effect.gen(function* () {
      const section = document.createElement('section')
      section.id = 'target'
      document.body.appendChild(section)

      const scrollIntoViewSpy = vi.fn()
      section.scrollIntoView = scrollIntoViewSpy

      yield* scrollIntoView('#target')

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest' })

      document.body.innerHTML = ''
    }),
  )

  it.effect('forwards the block option', () =>
    Effect.gen(function* () {
      const section = document.createElement('section')
      section.id = 'target'
      document.body.appendChild(section)

      const scrollIntoViewSpy = vi.fn()
      section.scrollIntoView = scrollIntoViewSpy

      yield* scrollIntoView('#target', { block: 'start' })

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'start' })

      document.body.innerHTML = ''
    }),
  )
})

describe('scrollIntoViewAfterPaint', () => {
  it.effect('fails with ElementNotFound when the selector does not match', () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(scrollIntoViewAfterPaint('#missing'))
      expect(error).toBeInstanceOf(ElementNotFound)
      expect(error.selector).toBe('#missing')
    }),
  )

  it.effect('defaults to { block: "nearest" }', () =>
    Effect.gen(function* () {
      const section = document.createElement('section')
      section.id = 'target'
      document.body.appendChild(section)

      const scrollIntoViewSpy = vi.fn()
      section.scrollIntoView = scrollIntoViewSpy

      yield* scrollIntoViewAfterPaint('#target')

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'nearest' })

      document.body.innerHTML = ''
    }),
  )

  it.effect('forwards the block option', () =>
    Effect.gen(function* () {
      const section = document.createElement('section')
      section.id = 'target'
      document.body.appendChild(section)

      const scrollIntoViewSpy = vi.fn()
      section.scrollIntoView = scrollIntoViewSpy

      yield* scrollIntoViewAfterPaint('#target', { block: 'start' })

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'start' })

      document.body.innerHTML = ''
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
