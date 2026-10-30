import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Popover, PopoverLive } from './block.js'

class PopoverTriggerClickTest extends Block<PopoverTriggerClickTest>()(
  'PopoverTriggerClickTest',
  {
    Model: Schema.Struct({ popover: Popover }),
  },
) {}

const makePopoverTriggerClickTestLive = (isModal: boolean) =>
  PopoverTriggerClickTest.make(
    Effect.fn(function* () {
      const popover = yield* new Popover('popover', { id: 'sort', isModal })

      return {
        model: { popover },
        view: (model, h) =>
          h.div(
            [],
            [
              model.popover.view({
                anchor: { placement: 'bottom-start' },
                toView: ({ button, panel, backdrop, isVisible }) =>
                  h.div(
                    [],
                    [
                      h.button([...button], ['Sort']),
                      ...(isVisible
                        ? [
                            h.div([...backdrop]),
                            h.div(
                              [...panel],
                              [
                                h.button(
                                  [h.Id('item'), h.Type('button')],
                                  ['Name'],
                                ),
                              ],
                            ),
                          ]
                        : []),
                    ],
                  ),
              }),
            ],
          ),
      }
    }),
  ).pipe(Layer.provide(PopoverLive))

const makeProgram = (container: HTMLElement, isModal: boolean) =>
  Program.makeElement(PopoverTriggerClickTest, {
    layer: makePopoverTriggerClickTestLive(isModal),
    container,
  })

const requireElement = (id: string): HTMLElement => {
  const element = document.getElementById(id)
  if (element === null) {
    throw new Error(`Missing #${id}`)
  }
  return element
}

const clickButtonInOneTask = (button: HTMLElement) => {
  button.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'mouse',
      button: 0,
    }),
  )
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
}

describe('Popover trigger click', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.documentElement.style.overflow = ''
  })

  it('treats a same-task click as one open, and still closes when focus leaves', async () => {
    const container = document.createElement('div')
    const outside = document.createElement('button')
    container.id = 'app'
    outside.id = 'outside'
    document.body.append(container, outside)
    const handle = Runtime.embed(makeProgram(container, false))

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('true')
      })

      requireElement('sort-panel').focus()
      outside.focus()

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('false')
      })
    } finally {
      handle.dispose()
    }
  })

  it('takes and releases modal resources once around a same-task click', async () => {
    const container = document.createElement('div')
    container.id = 'app'
    document.body.append(container)
    const handle = Runtime.embed(makeProgram(container, true))

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(document.querySelector('[inert]')).not.toBeNull()
      })

      requireElement('sort-panel').dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }),
      )

      await vi.waitFor(() => {
        expect(document.documentElement.style.overflow).toBe('')
        expect(document.querySelector('[inert]')).toBeNull()
      })
    } finally {
      handle.dispose()
    }
  })
})
