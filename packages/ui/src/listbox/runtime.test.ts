import { Effect, Fiber, Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Runtime from 'foldkit/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Message } from './shared.js'
import { Model, create, init } from './single.js'

const listboxId = 'sort'
const buttonId = `${listboxId}-button`
const itemsId = `${listboxId}-items`

const listbox = create()

const makeListboxProgram = (container: HTMLElement) =>
  Runtime.makeElement({
    Model,
    init: () => ({ model: init({ id: listboxId }) }),
    update: (model, message) => {
      const listboxUpdate = listbox.update(model, message)

      if (listboxUpdate.commands === undefined) {
        return { model: listboxUpdate.model }
      }

      return { model: listboxUpdate.model, commands: listboxUpdate.commands }
    },
    view: (model: Model, h: HtmlBuilder<Message>) =>
      listbox.view(
        model,
        {
          items: ['Name', 'Date'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Sort']),
          maybeSelectedValue: Option.none(),
        },
        h,
      ),
    container,
  })

const mousePointerEvent = (type: string): PointerEvent =>
  new PointerEvent(type, { pointerType: 'mouse', button: 0 })

describe('Listbox runtime pointer press', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('closes on items blur after a mouse press that left the button before release', async () => {
    const container = document.createElement('div')
    container.id = 'listbox-app'
    const outside = document.createElement('button')
    document.body.append(container, outside)

    const runtime = Effect.runFork(makeListboxProgram(container).start())

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
