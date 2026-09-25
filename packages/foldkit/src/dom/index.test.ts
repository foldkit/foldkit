import { Effect, Fiber } from 'effect'
import { expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { DEVTOOLS_HOST_ID } from '../devTools/host.js'
import { RenderCommit, createCommitNotifier } from '../render/commit.js'
import { DialogRuntime } from './dialogRuntime.js'
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

  it.effect('leaves padding-right unchanged when there is no scrollbar', () =>
    Effect.gen(function* () {
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
        window.innerWidth,
      )
      document.documentElement.style.paddingRight = '4px'

      yield* lockScroll
      expect(document.documentElement.style.paddingRight).toBe('4px')

      yield* unlockScroll
      document.documentElement.style.paddingRight = ''
      vi.restoreAllMocks()
    }),
  )

  it.effect('pads the document element by the scrollbar width in px', () =>
    Effect.gen(function* () {
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(
        window.innerWidth - 15,
      )

      yield* lockScroll
      expect(document.documentElement.style.paddingRight).toBe('15px')

      yield* unlockScroll
      expect(document.documentElement.style.paddingRight).toBe('')
      vi.restoreAllMocks()
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

  it.effect('resolves the allowed elements after the render commits', () =>
    Effect.gen(function* () {
      const main = document.createElement('main')
      const button = document.createElement('button')
      button.id = 'menu-button'
      main.appendChild(button)

      const portalRoot = document.createElement('div')
      portalRoot.id = 'portal-root'
      const footer = document.createElement('footer')
      document.body.appendChild(main)
      document.body.appendChild(portalRoot)
      document.body.appendChild(footer)

      const notifier = createCommitNotifier()
      notifier.markCommitPending()

      expect(document.querySelector('#menu-items')).toBeNull()

      const fiber = yield* Effect.forkChild(
        inertOthers('test', ['#menu-button', '#menu-items']).pipe(
          Effect.provideService(RenderCommit, notifier.service),
        ),
        { startImmediately: true },
      )

      yield* Effect.promise(
        () =>
          new Promise<void>(resolve => {
            queueMicrotask(() => {
              const items = document.createElement('div')
              items.id = 'menu-items'
              portalRoot.appendChild(items)
              resolve()
            })
          }),
      )

      expect(document.querySelector('#menu-items')).not.toBeNull()
      expect(fiber.pollUnsafe()).toBeUndefined()

      notifier.notifyCommitted()
      yield* Fiber.join(fiber)

      expect(portalRoot.inert).toBeFalsy()
      expect(portalRoot.getAttribute('aria-hidden')).toBeNull()
      expect(footer.inert).toBe(true)
      expect(footer.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('test')
      cleanupDom()
    }),
  )

  it.effect('stays restored when closed before the render commits', () =>
    Effect.gen(function* () {
      const { header, footer } = buildDom()
      const notifier = createCommitNotifier()
      notifier.markCommitPending()

      const fiber = yield* Effect.forkChild(
        inertOthers('test', ['#menu-button', '#menu-items']).pipe(
          Effect.provideService(RenderCommit, notifier.service),
        ),
        { startImmediately: true },
      )

      expect(fiber.pollUnsafe()).toBeUndefined()

      yield* restoreInert('test')
      notifier.notifyCommitted()
      yield* Fiber.join(fiber)

      expect(header.inert).toBeFalsy()
      expect(header.getAttribute('aria-hidden')).toBeNull()
      expect(footer.inert).toBeFalsy()
      expect(footer.getAttribute('aria-hidden')).toBeNull()

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

  it.effect('isolates a modal in the same commit that opens it', () =>
    Effect.gen(function* () {
      const background = document.createElement('main')
      makeDialog('solo')
      document.body.appendChild(background)

      const notifier = createCommitNotifier()
      notifier.markCommitPending()
      const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

      const opening = yield* Effect.forkChild(
        showDialog('#solo', { isModal: true }).pipe(
          Effect.provideService(RenderCommit, notifier.service),
        ),
        { startImmediately: true },
      )

      expect(background.inert).toBe(false)

      notifier.notifyCommitted()
      yield* Fiber.join(opening)

      expect(background.inert).toBe(true)
      expect(requestFrame).not.toHaveBeenCalled()

      yield* closeDialog('#solo')
      requestFrame.mockRestore()
      document.body.innerHTML = ''
    }),
  )

  it.effect('does not acquire the same dialog element twice', () =>
    Effect.gen(function* () {
      const dialog = makeDialog('solo')
      const trigger = document.createElement('button')
      document.body.prepend(trigger)
      trigger.focus()

      expect(yield* showDialog('#solo', { isModal: true })).toBe(true)
      expect(yield* showDialog('#solo', { isModal: true })).toBe(false)

      expect(yield* closeDialog('#solo')).toBe(true)
      expect(yield* closeDialog('#solo')).toBe(false)
      expect(document.activeElement).toBe(trigger)

      dialog.remove()
      trigger.remove()
    }),
  )

  it.effect(
    'isolates late body portals and allows a late developer overlay',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        makeDialog('solo')
        document.body.appendChild(background)

        yield* showDialog('#solo', {
          isModal: true,
          allowedOutsideSelectors: [`#${DEVTOOLS_HOST_ID}`],
        })

        const setBackgroundAttribute = vi.spyOn(background, 'setAttribute')
        const removeBackgroundAttribute = vi.spyOn(
          background,
          'removeAttribute',
        )

        const portalButton = document.createElement('button')
        document.body.appendChild(portalButton)

        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(portalButton.inert).toBe(true)
            expect(portalButton.getAttribute('aria-hidden')).toBe('true')
          }),
        )

        expect(setBackgroundAttribute).not.toHaveBeenCalled()
        expect(removeBackgroundAttribute).not.toHaveBeenCalled()

        const devToolsHost = document.createElement('div')
        devToolsHost.id = DEVTOOLS_HOST_ID
        document.body.appendChild(devToolsHost)

        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(devToolsHost.inert).toBe(false)
            expect(devToolsHost.hasAttribute('aria-hidden')).toBe(false)
            expect(portalButton.inert).toBe(true)
          }),
        )

        expect(setBackgroundAttribute).not.toHaveBeenCalled()
        expect(removeBackgroundAttribute).not.toHaveBeenCalled()
        setBackgroundAttribute.mockRestore()
        removeBackgroundAttribute.mockRestore()

        const disconnectObserver = vi.spyOn(
          MutationObserver.prototype,
          'disconnect',
        )
        const disconnectCount = disconnectObserver.mock.calls.length

        yield* closeDialog('#solo')

        expect(disconnectObserver.mock.calls.length).toBeGreaterThan(
          disconnectCount,
        )
        disconnectObserver.mockRestore()

        expect(background.inert).toBe(false)
        expect(portalButton.inert).toBe(false)
        expect(portalButton.hasAttribute('aria-hidden')).toBe(false)

        const laterButton = document.createElement('button')
        document.body.appendChild(laterButton)
        yield* Effect.yieldNow
        expect(laterButton.inert).toBe(false)

        document.body.innerHTML = ''
      }),
  )

  it.effect('isolates siblings appended within an allowed ancestor path', () =>
    Effect.gen(function* () {
      const appRoot = document.createElement('div')
      const dialog = document.createElement('dialog')
      dialog.id = 'solo'
      dialog.appendChild(document.createElement('button'))
      appRoot.appendChild(dialog)
      document.body.appendChild(appRoot)

      yield* showDialog('#solo', { isModal: true })

      const lateSibling = document.createElement('button')
      appRoot.appendChild(lateSibling)

      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(lateSibling.inert).toBe(true)
          expect(lateSibling.getAttribute('aria-hidden')).toBe('true')
        }),
      )

      yield* closeDialog('#solo')
      expect(lateSibling.inert).toBe(false)
      document.body.innerHTML = ''
    }),
  )

  it.effect('reasserts isolation if background attributes are changed', () =>
    Effect.gen(function* () {
      const background = document.createElement('main')
      background.setAttribute('aria-hidden', 'false')
      makeDialog('solo')
      document.body.appendChild(background)

      yield* showDialog('#solo', { isModal: true })

      const setBackgroundAttribute = vi.spyOn(background, 'setAttribute')
      background.setAttribute('aria-hidden', 'false')
      background.inert = false

      yield* Effect.promise(() =>
        vi.waitFor(() => {
          expect(background.inert).toBe(true)
          expect(background.getAttribute('aria-hidden')).toBe('true')
        }),
      )

      expect(
        setBackgroundAttribute.mock.calls.filter(
          ([name]) => name === 'aria-hidden',
        ),
      ).toHaveLength(2)
      setBackgroundAttribute.mockRestore()

      yield* closeDialog('#solo')
      expect(background.inert).toBe(false)
      expect(background.getAttribute('aria-hidden')).toBe('false')
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'restores background attributes changed while a modal is open',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        background.setAttribute('aria-hidden', 'true')
        background.inert = true
        makeDialog('solo')
        document.body.appendChild(background)

        yield* showDialog('#solo', { isModal: true })

        background.removeAttribute('aria-hidden')
        background.inert = false

        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(background.inert).toBe(true)
            expect(background.getAttribute('aria-hidden')).toBe('true')
          }),
        )

        yield* closeDialog('#solo')

        expect(background.inert).toBe(false)
        expect(background.getAttribute('aria-hidden')).toBeNull()
        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'restores pending background attribute changes when a modal closes',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        background.setAttribute('aria-hidden', 'true')
        background.inert = true
        makeDialog('solo')
        document.body.appendChild(background)

        yield* showDialog('#solo', { isModal: true })

        background.removeAttribute('aria-hidden')
        background.inert = false
        yield* closeDialog('#solo')

        expect(background.inert).toBe(false)
        expect(background.getAttribute('aria-hidden')).toBeNull()
        document.body.innerHTML = ''
      }),
  )

  it.effect('preserves another inert lock when the modal closes', () =>
    Effect.gen(function* () {
      const background = document.createElement('main')
      background.setAttribute('aria-hidden', 'false')
      makeDialog('solo')
      document.body.appendChild(background)

      yield* inertOthers('other-lock', ['#solo'])
      yield* showDialog('#solo', { isModal: true })
      yield* closeDialog('#solo')

      expect(background.inert).toBe(true)
      expect(background.getAttribute('aria-hidden')).toBe('true')

      yield* restoreInert('other-lock')
      expect(background.inert).toBe(false)
      expect(background.getAttribute('aria-hidden')).toBe('false')
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'allows an overlay that appears inside an inert background branch',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        const backgroundButton = document.createElement('button')
        background.appendChild(backgroundButton)
        makeDialog('solo')
        document.body.appendChild(background)

        yield* showDialog('#solo', {
          isModal: true,
          allowedOutsideSelectors: [`#${DEVTOOLS_HOST_ID}`],
        })
        expect(background.inert).toBe(true)

        const devToolsHost = document.createElement('div')
        background.appendChild(devToolsHost)
        yield* Effect.yieldNow
        expect(background.inert).toBe(true)
        devToolsHost.id = DEVTOOLS_HOST_ID

        yield* Effect.promise(() =>
          vi.waitFor(() => {
            expect(background.inert).toBe(false)
            expect(backgroundButton.inert).toBe(true)
            expect(devToolsHost.inert).toBe(false)
          }),
        )

        yield* closeDialog('#solo')
        expect(backgroundButton.inert).toBe(false)
        document.body.innerHTML = ''
      }),
  )

  it.effect('does not register a runtime owner when opening fails', () =>
    Effect.gen(function* () {
      const dialog = makeDialog('solo')
      const registered = new Set<string>()
      const show = vi.spyOn(dialog, 'show').mockImplementation(() => {
        throw new Error('Dialog refused to open')
      })

      const opening = yield* Effect.exit(
        showDialog('#solo', { isModal: true }).pipe(
          Effect.provideService(DialogRuntime, {
            register: id => {
              registered.add(id)
            },
            unregister: id => {
              registered.delete(id)
            },
          }),
        ),
      )

      expect(opening._tag).toBe('Failure')
      expect(registered.size).toBe(0)
      expect(dialog.open).toBe(false)

      show.mockRestore()
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'isolates the topmost sibling modal and restores its parent on close',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        const trigger = document.createElement('button')
        background.appendChild(trigger)
        background.setAttribute('aria-hidden', 'false')

        const parent = makeDialog('parent')
        const child = makeDialog('child')
        const parentButton = parent.querySelector('button')
        const childButton = child.querySelector('button')
        const devToolsHost = document.createElement('div')
        devToolsHost.id = DEVTOOLS_HOST_ID
        document.body.append(background, devToolsHost)
        trigger.focus()

        yield* showDialog('#parent', {
          isModal: true,
          allowedOutsideSelectors: [`#${DEVTOOLS_HOST_ID}`],
        })

        expect(background.inert).toBe(true)
        expect(child.inert).toBe(true)
        expect(parent.inert).toBe(false)
        expect(devToolsHost.inert).toBe(false)
        expect(document.activeElement).toBe(parentButton)

        yield* showDialog('#child', {
          isModal: true,
          allowedOutsideSelectors: [`#${DEVTOOLS_HOST_ID}`],
        })

        expect(parent.inert).toBe(true)
        expect(child.inert).toBe(false)
        expect(document.activeElement).toBe(childButton)

        yield* closeDialog('#child')

        expect(parent.inert).toBe(false)
        expect(child.inert).toBe(true)
        expect(document.activeElement).toBe(parentButton)

        yield* closeDialog('#parent')

        expect(background.inert).toBe(false)
        expect(background.getAttribute('aria-hidden')).toBe('false')
        expect(document.activeElement).toBe(trigger)

        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'releases a removed topmost modal before returning focus beneath it',
    () =>
      Effect.gen(function* () {
        const background = document.createElement('main')
        background.setAttribute('aria-hidden', 'false')
        const originallyInert = document.createElement('aside')
        originallyInert.inert = true

        const parent = makeDialog('parent')
        const child = makeDialog('child')
        const parentButton = parent.querySelector('button')
        document.body.append(background, originallyInert)

        let wasParentInertOnReturnFocus: boolean | undefined
        parentButton?.addEventListener('focus', () => {
          wasParentInertOnReturnFocus = parent.inert
        })

        yield* lockScroll
        yield* showDialog('#parent', { isModal: true })
        yield* lockScroll
        yield* showDialog('#child', { isModal: true })

        child.remove()
        expect(yield* releaseDialogResources('child')).toBe(true)

        expect(parent.inert).toBe(false)
        expect(background.inert).toBe(true)
        expect(document.activeElement).toBe(parentButton)
        expect(wasParentInertOnReturnFocus).toBe(false)
        expect(document.documentElement.style.overflow).toBe('hidden')

        expect(yield* closeDialog('#parent')).toBe(true)
        yield* unlockScroll

        expect(background.inert).toBe(false)
        expect(background.getAttribute('aria-hidden')).toBe('false')
        expect(originallyInert.inert).toBe(true)
        expect(document.documentElement.style.overflow).not.toBe('hidden')

        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'falls back to the first focusable descendant when focusSelector misses',
    () =>
      Effect.gen(function* () {
        const dialog = makeDialog('solo')
        const button = dialog.querySelector('button')

        yield* showDialog('#solo', { focusSelector: '#missing' })

        expect(document.activeElement).toBe(button)

        yield* closeDialog('#solo')
        document.body.innerHTML = ''
      }),
  )

  it.effect(
    'falls back when focusSelector matches an element that cannot receive focus',
    () =>
      Effect.gen(function* () {
        const dialog = makeDialog('solo')
        const nonFocusable = document.createElement('div')
        nonFocusable.id = 'non-focusable'
        dialog.prepend(nonFocusable)
        const button = dialog.querySelector('button')

        yield* showDialog('#solo', { focusSelector: '#non-focusable' })

        expect(document.activeElement).toBe(button)

        yield* closeDialog('#solo')
        document.body.innerHTML = ''
      }),
  )

  it.effect('focuses the first focusable descendant by default', () =>
    Effect.gen(function* () {
      const dialog = makeDialog('solo')
      const button = dialog.querySelector('button')

      yield* showDialog('#solo')

      expect(document.activeElement).toBe(button)

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('skips descendants that cannot receive focus', () =>
    Effect.gen(function* () {
      const dialog = document.createElement('dialog')
      dialog.id = 'solo'

      const hiddenInput = document.createElement('input')
      hiddenInput.type = 'hidden'

      const hiddenButton = document.createElement('button')
      hiddenButton.style.display = 'none'

      const disabledButton = document.createElement('button')
      disabledButton.disabled = true

      const visibleButton = document.createElement('button')

      dialog.append(hiddenInput, hiddenButton, disabledButton, visibleButton)
      document.body.appendChild(dialog)

      yield* showDialog('#solo')

      expect(document.activeElement).toBe(visibleButton)
      expect(pressTab().defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(visibleButton)

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('ignores nonfocusable descendants when trapping Tab', () =>
    Effect.gen(function* () {
      const dialog = document.createElement('dialog')
      dialog.id = 'solo'

      const visibleButton = document.createElement('button')

      const hiddenInput = document.createElement('input')
      hiddenInput.type = 'hidden'

      const hiddenButton = document.createElement('button')
      hiddenButton.style.display = 'none'

      dialog.append(visibleButton, hiddenInput, hiddenButton)
      document.body.appendChild(dialog)

      yield* showDialog('#solo')

      expect(document.activeElement).toBe(visibleButton)
      expect(pressTab().defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(visibleButton)

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('focuses the dialog when it has no focusable descendants', () =>
    Effect.gen(function* () {
      const dialog = document.createElement('dialog')
      dialog.id = 'solo'
      document.body.appendChild(dialog)

      yield* showDialog('#solo')

      expect(document.activeElement).toBe(dialog)

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('traps Tab on a dialog with no focusable descendants', () =>
    Effect.gen(function* () {
      const dialog = document.createElement('dialog')
      dialog.id = 'solo'
      document.body.appendChild(dialog)

      yield* showDialog('#solo')

      expect(pressTab().defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(dialog)

      yield* closeDialog('#solo')
      document.body.innerHTML = ''
    }),
  )

  it.effect('allows a nonmodal dialog opened above a modal dialog', () =>
    Effect.gen(function* () {
      const background = document.createElement('main')
      const trigger = document.createElement('button')
      background.appendChild(trigger)
      const parent = makeDialog('parent')
      const child = makeDialog('child')
      const parentButton = parent.querySelector('button')
      const childButton = child.querySelector('button')
      document.body.appendChild(background)
      trigger.focus()

      yield* showDialog('#parent', { isModal: true })
      expect(child.inert).toBe(true)

      yield* showDialog('#child')

      expect(background.inert).toBe(true)
      expect(parent.inert).toBe(false)
      expect(child.inert).toBe(false)
      expect(document.activeElement).toBe(childButton)

      yield* closeDialog('#child')

      expect(background.inert).toBe(true)
      expect(parent.inert).toBe(false)
      expect(child.inert).toBe(true)
      expect(document.activeElement).toBe(parentButton)

      yield* closeDialog('#parent')

      expect(background.inert).toBe(false)
      expect(child.inert).toBe(false)
      expect(document.activeElement).toBe(trigger)
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'closeDialog reports whether it released the hygiene showDialog installed',
    () =>
      Effect.gen(function* () {
        makeDialog('solo')

        expect(yield* closeDialog('#solo')).toBe(false)

        yield* showDialog('#solo')

        expect(yield* closeDialog('#solo')).toBe(true)
        expect(yield* closeDialog('#solo')).toBe(false)

        document.body.innerHTML = ''
      }),
  )

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
        const cancelled: Array<
          Readonly<{ id: string; isCustomEvent: boolean }>
        > = []
        document.querySelector('#parent')?.addEventListener('cancel', event =>
          cancelled.push({
            id: 'parent',
            isCustomEvent: event instanceof CustomEvent,
          }),
        )
        document.querySelector('#child')?.addEventListener('cancel', event =>
          cancelled.push({
            id: 'child',
            isCustomEvent: event instanceof CustomEvent,
          }),
        )

        yield* showDialog('#parent')
        yield* showDialog('#child')

        pressEscape()
        expect(cancelled).toEqual([{ id: 'child', isCustomEvent: true }])

        yield* closeDialog('#child')
        pressEscape()
        expect(cancelled).toEqual([
          { id: 'child', isCustomEvent: true },
          { id: 'parent', isCustomEvent: true },
        ])

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

  it.effect('does not close when a descendant consumes Escape', () =>
    Effect.gen(function* () {
      const dialog = makeDialog('solo')
      const input = document.createElement('input')
      const cancelled: Array<string> = []

      input.addEventListener('keydown', event => event.preventDefault())
      dialog.addEventListener('cancel', () => cancelled.push('solo'))
      dialog.appendChild(input)

      yield* showDialog('#solo')

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      input.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
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

  it.effect('restores focus to an empty dialog beneath a stacked dialog', () =>
    Effect.gen(function* () {
      const parent = document.createElement('dialog')
      parent.id = 'parent'
      document.body.appendChild(parent)
      makeDialog('child')

      yield* showDialog('#parent')
      yield* showDialog('#child')
      yield* closeDialog('#child')

      expect(document.activeElement).toBe(parent)

      yield* closeDialog('#parent')
      document.body.innerHTML = ''
    }),
  )

  it.effect('does not restore focus to an inert dialog beneath', () =>
    Effect.gen(function* () {
      const parent = document.createElement('dialog')
      parent.id = 'parent'
      document.body.appendChild(parent)
      makeDialog('child')

      yield* showDialog('#parent')
      yield* showDialog('#child')

      const focusParent = vi.spyOn(parent, 'focus')
      parent.inert = true
      yield* closeDialog('#child')

      expect(focusParent).not.toHaveBeenCalled()

      parent.inert = false
      yield* closeDialog('#parent')
      document.body.innerHTML = ''
    }),
  )

  it.effect('does not restore focus to a closed dialog beneath', () =>
    Effect.gen(function* () {
      const parent = document.createElement('dialog')
      parent.id = 'parent'
      parent.tabIndex = 0
      parent.style.display = 'block'
      document.body.appendChild(parent)
      makeDialog('child')

      yield* showDialog('#parent')
      yield* showDialog('#child')

      parent.close()
      const focusParent = vi.spyOn(parent, 'focus')
      yield* closeDialog('#child')

      expect(focusParent).not.toHaveBeenCalled()

      yield* closeDialog('#parent')
      document.body.innerHTML = ''
    }),
  )

  it.effect(
    'restores focus after a lower dialog closes before the topmost dialog',
    () =>
      Effect.gen(function* () {
        const trigger = document.createElement('button')
        document.body.appendChild(trigger)
        const parent = makeDialog('parent')
        const child = makeDialog('child')
        const childButton = child.querySelector<HTMLButtonElement>('button')

        trigger.focus()
        yield* showDialog('#parent', { isModal: true })
        yield* showDialog('#child', { isModal: true })

        yield* closeDialog('#parent')

        expect(parent.open).toBe(false)
        expect(child.open).toBe(true)
        expect(document.activeElement).toBe(childButton)

        yield* closeDialog('#child')

        expect(document.activeElement).toBe(trigger)
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
