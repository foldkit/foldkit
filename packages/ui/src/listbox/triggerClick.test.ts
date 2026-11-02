import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { make } from './public.js'

const TestListbox = make<string>()
const TestListboxLive = TestListbox.pipe(Layer.provide(Animation.AnimationLive))

class ListboxTriggerClickTest extends Block<ListboxTriggerClickTest>()(
  'ListboxTriggerClickTest',
  {
    Model: Schema.Struct({ listbox: TestListbox }),
  },
) {}

const ListboxTriggerClickTestLive = ListboxTriggerClickTest.toLayer(() => ({
  init: () => ({
    listbox: new TestListbox('listbox', {
      id: 'sort',
      isModal: true,
    }),
  }),
  view: (model, h) =>
    h.div(
      [],
      [
        model.listbox.view({
          items: ['Name'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Sort']),
          maybeSelectedValue: Option.none(),
          anchor: { placement: 'bottom-start' },
        }),
      ],
    ),
})).pipe(Layer.provide(TestListboxLive))

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
      Program.makeElement(ListboxTriggerClickTest, {
        layer: ListboxTriggerClickTestLive,
        container,
      }),
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
