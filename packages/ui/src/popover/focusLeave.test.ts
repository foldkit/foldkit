import { Effect, Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { Popover, PopoverLive } from './block.js'

class PopoverFocusLeaveTest extends Block<PopoverFocusLeaveTest>()(
  'PopoverFocusLeaveTest',
  {
    Model: Schema.Struct({ popover: Popover }),
  },
) {}

const PopoverFocusLeaveTestLive = PopoverFocusLeaveTest.make(
  Effect.fn(function* () {
    const popover = yield* new Popover('popover', { id: 'sort' })

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

const makeProgram = (container: HTMLElement) =>
  Program.makeElement(PopoverFocusLeaveTest, {
    layer: PopoverFocusLeaveTestLive,
    container,
  })

const requireElement = (id: string): HTMLElement => {
  const element = document.getElementById(id)
  if (element === null) {
    throw new Error(`Missing #${id}`)
  }
  return element
}

describe('Popover focus leave', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('stays open when focus moves from the panel into its content, and closes when focus leaves', async () => {
    const container = document.createElement('div')
    const outside = document.createElement('button')
    container.id = 'app'
    outside.id = 'outside'
    document.body.append(container, outside)
    const handle = Runtime.embed(makeProgram(container))

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      requireElement('sort-button').dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Enter',
        }),
      )

      await vi.waitFor(() => {
        expect(document.activeElement?.id).toBe('sort-panel')
      })

      requireElement('item').focus()
      expect(document.getElementById('sort-panel')).not.toBeNull()

      outside.focus()

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('false')
      })
      expect(document.getElementById('sort-panel')).toBeNull()
    } finally {
      handle.dispose()
    }
  })
})
