import { Effect, Fiber } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Runtime from 'foldkit/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Message, Model, create, init } from './index.js'

const menuId = 'sort'
const buttonId = `${menuId}-button`
const itemsId = `${menuId}-items`

const menu = create()

const makeMenuProgram = (container: HTMLElement) =>
  Runtime.makeElement({
    Model,
    init: () => ({ model: init({ id: menuId }) }),
    update: (model, message) => {
      const menuUpdate = menu.update(model, message)

      if (menuUpdate.commands === undefined) {
        return { model: menuUpdate.model }
      }

      return { model: menuUpdate.model, commands: menuUpdate.commands }
    },
    view: (model: Model, h: HtmlBuilder<Message>) =>
      menu.view(
        model,
        {
          items: ['Name', 'Date'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Sort']),
        },
        h,
      ),
    container,
  })

const mousePointerEvent = (type: string): PointerEvent =>
  new PointerEvent(type, { pointerType: 'mouse', button: 0 })

describe('Menu runtime pointer press', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('closes on items blur after a mouse press that left the button before release', async () => {
    const container = document.createElement('div')
    container.id = 'menu-app'
    const outside = document.createElement('button')
    document.body.append(container, outside)

    const runtime = Effect.runFork(makeMenuProgram(container).start())

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(buttonId)).not.toBeNull()
      })

      const button = document.getElementById(buttonId)
      button?.dispatchEvent(mousePointerEvent('pointerdown'))

      await vi.waitFor(() => {
        expect(document.getElementById(itemsId)).not.toBeNull()
      })

      button?.dispatchEvent(mousePointerEvent('pointerleave'))

      document.getElementById(itemsId)?.focus()
      outside.focus()

      await vi.waitFor(() => {
        expect(button?.getAttribute('aria-expanded')).toBe('false')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })
})
