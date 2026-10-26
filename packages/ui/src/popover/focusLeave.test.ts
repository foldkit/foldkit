import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { PopoverBlock } from './block.js'

const Model = Schema.Struct({ popover: PopoverBlock.Model })
const PopoverFocusLeaveTestDefinition = Block.makeDefinition(
  'PopoverFocusLeaveTest',
  {
    Model,
    Message: Schema.Never,
  },
)
const foldPopoverOutMessage =
  PopoverFocusLeaveTestDefinition.makeOutMessageFold(PopoverBlock, {
    Opened: () => PopoverFocusLeaveTestDefinition.makeNoopStep(),
    Closed: () => PopoverFocusLeaveTestDefinition.makeNoopStep(),
  })
const PopoverBinding = PopoverFocusLeaveTestDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: false,
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })
const PopoverFocusLeaveTestComposition =
  PopoverFocusLeaveTestDefinition.makeComposition({
    bindings: [PopoverBinding],
  })
const view = PopoverFocusLeaveTestComposition.makeView((model, h) =>
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

const makeProgram = (container: HTMLElement) => {
  const prepare = () =>
    PopoverFocusLeaveTestComposition.prepareBlock({
      init: PopoverFocusLeaveTestComposition.makeInit(() =>
        PopoverBinding.init({
          args: [{ id: 'sort' }],
          toParentModel: popover => ({ popover }),
        }),
      ),
      update: PopoverFocusLeaveTestComposition.makeUpdate({}),
      view,
    })
  const block: Block.FromAssemblyWithView<typeof Model, typeof prepare> =
    Block.assemble(prepare)

  return Program.makeElement({
    block,
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
