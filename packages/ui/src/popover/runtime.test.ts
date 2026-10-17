import { Effect, Fiber } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as Runtime from 'foldkit/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Message, Model, init, update, view } from './index.js'

const popoverId = 'sort'
const buttonId = `${popoverId}-button`
const panelId = `${popoverId}-panel`

const makePopoverProgram = (container: HTMLElement) =>
  Runtime.makeElement({
    Model,
    init: () => ({ model: init({ id: popoverId }) }),
    update: (model, message) => {
      const popoverUpdate = update(model, message)

      if (popoverUpdate.commands === undefined) {
        return { model: popoverUpdate.model }
      }

      return { model: popoverUpdate.model, commands: popoverUpdate.commands }
    },
    view: (model: Model, h: HtmlBuilder<Message>) =>
      view(
        model,
        {
          anchor: { placement: 'bottom-start' },
          toView: ({ button, panel, backdrop, isVisible }) =>
            h.div(
              [],
              [
                h.button([...button], ['Sort']),
                ...(isVisible
                  ? [
                      h.div([...backdrop]),
                      h.div([...panel], [h.p([], ['Sort by name'])]),
                    ]
                  : []),
              ],
            ),
        },
        h,
      ),
    container,
  })

const mousePointerEvent = (type: string): PointerEvent =>
  new PointerEvent(type, { pointerType: 'mouse', button: 0 })

describe('Popover runtime pointer press', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('closes on panel blur after a mouse press that left the button before release', async () => {
    const container = document.createElement('div')
    container.id = 'popover-app'
    const outside = document.createElement('button')
    document.body.append(container, outside)

    const runtime = Effect.runFork(makePopoverProgram(container).start())

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(buttonId)).not.toBeNull()
      })

      const button = document.getElementById(buttonId)
      button?.dispatchEvent(mousePointerEvent('pointerdown'))

      await vi.waitFor(() => {
        expect(document.getElementById(panelId)).not.toBeNull()
      })

      button?.dispatchEvent(mousePointerEvent('pointerleave'))

      document.getElementById(panelId)?.focus()
      outside.focus()

      await vi.waitFor(() => {
        expect(button?.getAttribute('aria-expanded')).toBe('false')
      })
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })
})
