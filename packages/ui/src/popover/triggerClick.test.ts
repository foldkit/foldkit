import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { PopoverBlock, layer } from './block.js'

const Model = Schema.Struct({ popover: PopoverBlock.Model })
type Model = typeof Model.Type
const PopoverTriggerClickTestKey = Symbol('PopoverTriggerClickTest')
const PopoverTriggerClickTestBlock = Block.make('PopoverTriggerClickTest', {
  key: PopoverTriggerClickTestKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message: Schema.Never,
})
const foldPopoverOutMessage = PopoverTriggerClickTestBlock.makeOutMessageFold(
  PopoverBlock,
  {
    Opened: () => PopoverTriggerClickTestBlock.makeNoopStep(),
    Closed: () => PopoverTriggerClickTestBlock.makeNoopStep(),
  },
)
const PopoverBinding = PopoverTriggerClickTestBlock.makeRequiredFieldBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: false,
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })
const PopoverTriggerClickTestComposition =
  PopoverTriggerClickTestBlock.makeComposition({
    bindings: [PopoverBinding],
  })
const view = PopoverTriggerClickTestComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        PopoverBinding.embedView({
          slotId: 'popover',
          model: model.popover,
          viewInputs: {
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
          },
        }),
      ),
    ],
  ),
)

const makeProgram = (container: HTMLElement, isModal: boolean) => {
  const block = {
    block: PopoverTriggerClickTestBlock,
    layer: PopoverTriggerClickTestBlock.makeLayer({
      init: PopoverTriggerClickTestComposition.makeInit(() =>
        PopoverBinding.init({
          args: [{ id: 'sort', isModal }],
          toParentModel: popover => ({ popover }),
        }),
      ),
      update: PopoverTriggerClickTestComposition.makeUpdate({}),
      view,
    }).pipe(Layer.provide(layer)),
  }

  return Program.makeElement({
    ...block,
    container,
  })
}

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
