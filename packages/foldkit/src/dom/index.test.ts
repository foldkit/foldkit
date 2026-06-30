import { Effect } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  ElementNotFound,
  closeDialog,
  focus,
  inertOthers,
  lockScroll,
  releaseDialogResources,
  restoreInert,
  scrollIntoView,
  scrollIntoViewAfterPaint,
  showDialog,
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

describe('showDialog', () => {
  const makeDialog = (id: string): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = id
    const button = document.createElement('button')
    button.textContent = 'ok'
    dialog.appendChild(button)
    document.body.appendChild(dialog)
    return dialog
  }

  const pressEscape = (): void => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
  }

  const pressTab = (): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
    return event
  }

  it.effect('routes Escape to a single open dialog', () =>
    Effect.gen(function* () {
      makeDialog('solo')
      const cancelled: Array<string> = []
      document
        .querySelector('#solo')
        ?.addEventListener('cancel', () => cancelled.push('solo'))

      yield* showDialog('#solo')
      pressEscape()

      expect(cancelled).toEqual(['solo'])

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'routes Escape to the topmost dialog when dialogs are stacked',
    () =>
      Effect.gen(function* () {
        makeDialog('parent')
        makeDialog('child')
        const cancelled: Array<string> = []
        document
          .querySelector('#parent')
          ?.addEventListener('cancel', () => cancelled.push('parent'))
        document
          .querySelector('#child')
          ?.addEventListener('cancel', () => cancelled.push('child'))

        yield* showDialog('#parent')
        yield* showDialog('#child')

        pressEscape()
        expect(cancelled).toEqual(['child'])

        yield* closeDialog('#child')
        pressEscape()
        expect(cancelled).toEqual(['child', 'parent'])

        yield* closeDialog('#parent')
        document.body.innerHTML = ''
      }),
  )

  it.effect('does not close when the Escape was already prevented', () =>
    Effect.gen(function* () {
      makeDialog('solo')
      const cancelled: Array<string> = []
      document
        .querySelector('#solo')
        ?.addEventListener('cancel', () => cancelled.push('solo'))

      yield* showDialog('#solo')

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      event.preventDefault()
      document.dispatchEvent(event)

      expect(cancelled).toEqual([])

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('traps Tab within the topmost dialog only', () =>
    Effect.gen(function* () {
      const parent = makeDialog('parent')
      const child = makeDialog('child')

      yield* showDialog('#parent')
      yield* showDialog('#child')

      child.querySelector<HTMLButtonElement>('button')?.focus()
      expect(pressTab().defaultPrevented).toBe(true)

      parent.querySelector<HTMLButtonElement>('button')?.focus()
      expect(pressTab().defaultPrevented).toBe(false)

      yield* closeDialog('#child')
      yield* closeDialog('#parent')
      document.body.innerHTML = ''
    }),
  )

  it.effect('restores focus to the trigger when a dialog closes', () =>
    Effect.gen(function* () {
      const trigger = document.createElement('button')
      trigger.id = 'trigger'
      document.body.appendChild(trigger)
      makeDialog('solo')

      trigger.focus()
      yield* showDialog('#solo')
      yield* closeDialog('#solo')

      expect(document.activeElement).toBe(trigger)
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'restores focus to the dialog beneath when a stacked dialog closes',
    () =>
      Effect.gen(function* () {
        const parent = makeDialog('parent')
        makeDialog('child')
        const parentButton = parent.querySelector<HTMLButtonElement>('button')

        yield* showDialog('#parent')
        parentButton?.focus()
        yield* showDialog('#child')
        yield* closeDialog('#child')

        expect(document.activeElement).toBe(parentButton)

        yield* closeDialog('#parent')
        document.body.innerHTML = ''
      }),
  )
})

describe('releaseDialogResources', () => {
  const makeDialog = (id: string): HTMLDialogElement => {
    const dialog = document.createElement('dialog')
    dialog.id = id
    const button = document.createElement('button')
    button.textContent = 'ok'
    dialog.appendChild(button)
    document.body.appendChild(dialog)
    return dialog
  }

  const pressEscape = (): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    document.dispatchEvent(event)
    return event
  }

  it.effect('is a no-op when no dialog holds hygiene for the id', () =>
    Effect.gen(function* () {
      const released = yield* releaseDialogResources('nonexistent')
      expect(released).toBe(false)
    }),
  )

  it.effect(
    'releases hygiene by id after the element has been removed from the DOM',
    () =>
      Effect.gen(function* () {
        const trigger = document.createElement('button')
        trigger.id = 'trigger'
        document.body.appendChild(trigger)
        const dialog = makeDialog('solo')

        trigger.focus()
        yield* lockScroll
        yield* showDialog('#solo')
        expect(document.documentElement.style.overflow).toBe('hidden')

        // The real unmount scenario: the element is gone before the backstop
        // runs. A selector-based release would find nothing here.
        dialog.remove()
        expect(document.querySelector('#solo')).toBeNull()

        const released = yield* releaseDialogResources('solo')

        expect(released).toBe(true)
        expect(document.documentElement.style.overflow).toBe('')
        expect(document.activeElement).toBe(trigger)

        // The keydown focus-trap handler was removed, so Escape no longer
        // dispatches a cancel against a stale handler.
        pressEscape()

        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'releases the scroll lock, focus, and keyboard handler exactly once',
    () =>
      Effect.gen(function* () {
        const trigger = document.createElement('button')
        trigger.id = 'trigger'
        document.body.appendChild(trigger)
        makeDialog('solo')

        trigger.focus()
        yield* lockScroll
        yield* showDialog('#solo')
        expect(document.documentElement.style.overflow).toBe('hidden')

        const cancelled: Array<string> = []
        document
          .querySelector('#solo')
          ?.addEventListener('cancel', () => cancelled.push('solo'))

        const released = yield* releaseDialogResources('solo')

        expect(released).toBe(true)
        expect(document.documentElement.style.overflow).toBe('')
        expect(document.activeElement).toBe(trigger)

        // The keydown focus-trap handler was removed, so Escape no longer
        // dispatches a cancel.
        pressEscape()
        expect(cancelled).toEqual([])

        document.body.innerHTML = ''
      }),
  )

  it.effect('is idempotent: a second release does nothing', () =>
    Effect.gen(function* () {
      makeDialog('solo')
      yield* lockScroll
      yield* showDialog('#solo')

      const first = yield* releaseDialogResources('solo')
      const second = yield* releaseDialogResources('solo')

      expect(first).toBe(true)
      expect(second).toBe(false)
      expect(document.documentElement.style.overflow).toBe('')

      document.body.innerHTML = ''
    }),
  )

  it.effect('does not release after a normal close already released', () =>
    Effect.gen(function* () {
      makeDialog('solo')
      yield* lockScroll
      yield* showDialog('#solo')

      yield* closeDialog('#solo')
      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('')

      const released = yield* releaseDialogResources('solo')
      expect(released).toBe(false)
      expect(document.documentElement.style.overflow).toBe('')

      document.body.innerHTML = ''
    }),
  )

  it.effect('does not under-count a scroll lock held by another holder', () =>
    Effect.gen(function* () {
      makeDialog('solo')
      yield* lockScroll
      yield* showDialog('#solo')

      // A second, unrelated holder takes the shared scroll lock.
      yield* lockScroll
      expect(document.documentElement.style.overflow).toBe('hidden')

      const released = yield* releaseDialogResources('solo')
      expect(released).toBe(true)

      // The dialog released its single lock, but the other holder's lock
      // keeps the page locked.
      expect(document.documentElement.style.overflow).toBe('hidden')

      yield* unlockScroll
      expect(document.documentElement.style.overflow).toBe('')

      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'releasing the top of a stack leaves the dialog beneath trapping Escape',
    () =>
      Effect.gen(function* () {
        const parent = makeDialog('parent')
        makeDialog('child')
        const cancelled: Array<string> = []
        parent.addEventListener('cancel', () => cancelled.push('parent'))

        yield* lockScroll
        yield* showDialog('#parent')
        yield* lockScroll
        yield* showDialog('#child')

        const released = yield* releaseDialogResources('child')
        expect(released).toBe(true)

        // The parent is now topmost again and still routes Escape to cancel.
        pressEscape()
        expect(cancelled).toEqual(['parent'])

        yield* releaseDialogResources('parent')
        expect(document.documentElement.style.overflow).toBe('')

        document.body.innerHTML = ''
      }),
  )
})
