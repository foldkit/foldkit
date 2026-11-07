import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { layer as ListboxLayer, makeBlock } from './public.js'
import { InitConfig } from './types.js'

const TestListbox = makeBlock()

const Model = Schema.Struct({ listbox: TestListbox.Model })
type Model = typeof Model.Type
const ListboxTriggerClickTestKey = Symbol('ListboxTriggerClickTest')
const ListboxTriggerClickTestBlock = Block.make('ListboxTriggerClickTest', {
  key: ListboxTriggerClickTestKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  ChildInitContext: InitConfig,
  view: { kind: 'Element' },
})
const foldListboxOutMessage = ListboxTriggerClickTestBlock.makeOutMessageFold(
  TestListbox,
  {
    Selected: () => ListboxTriggerClickTestBlock.makeNoopStep(),
  },
)
const ListboxBinding = ListboxTriggerClickTestBlock.makeRequiredFieldBinding(
  TestListbox,
  {
    field: 'listbox',
    init: { contextToArgs: config => [config] },
  },
).withOutMessagePolicy({ fold: foldListboxOutMessage })
const ListboxTriggerClickTestComposition =
  ListboxTriggerClickTestBlock.makeComposition({
    bindings: [ListboxBinding],
  })
const view = ListboxTriggerClickTestComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        ListboxBinding.embedView({
          slotId: 'listbox',
          model: model.listbox,
          viewInputs: {
            items: ['Name'],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            buttonContent: h.span([], ['Sort']),
            maybeSelectedValue: Option.none(),
            anchor: { placement: 'bottom-start' },
          },
        }),
      ),
    ],
  ),
)
const init = ListboxTriggerClickTestComposition.makeInit(() => ({
  model: {},
  childInitContext: { id: 'sort', isModal: true },
}))
const update = ListboxTriggerClickTestComposition.makeUpdate({})
const ApplicationBlock = {
  block: ListboxTriggerClickTestBlock,
  layer: ListboxTriggerClickTestBlock.makeLayer(
    Effect.gen(function* () {
      const children =
        yield* ListboxTriggerClickTestComposition.acquireChildren()

      return {
        children,
        init,
        update,
        view,
      }
    }),
  ).pipe(Layer.provide(ListboxLayer)),
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

describe('Listbox trigger click', () => {
  afterEach(() => {
    document.body.replaceChildren()
    document.documentElement.style.overflow = ''
  })

  it('treats a same-task click as one open and releases modal resources on close', async () => {
    const background = document.createElement('button')
    const container = document.createElement('div')
    container.id = 'app'
    document.body.append(background, container)
    const handle = Runtime.embed(
      Program.makeElement({ ...ApplicationBlock, container }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('true')
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(background.inert).toBe(true)
      })

      requireElement('sort-items').dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }),
      )

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('false')
        expect(document.documentElement.style.overflow).toBe('')
        expect(background.inert).toBe(false)
      })
    } finally {
      handle.dispose()
    }
  })
})
