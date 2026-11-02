import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from '../animation/block.js'
import { make } from './public.js'

const TestMenu = make<string>()
const TestMenuLive = TestMenu.pipe(Layer.provide(Animation.AnimationLive))

class MenuTriggerClickTest extends Block<MenuTriggerClickTest>()(
  'MenuTriggerClickTest',
  { Model: Schema.Struct({ menu: TestMenu }) },
) {}

const MenuTriggerClickTestLive = MenuTriggerClickTest.toLayer(() => ({
  init: () => ({
    menu: new TestMenu('menu', { id: 'actions', isModal: true }),
  }),
  view: (model, h) =>
    h.div(
      [],
      [
        model.menu.view({
          items: ['Name'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
          anchor: { placement: 'bottom-start' },
        }),
      ],
    ),
})).pipe(Layer.provide(TestMenuLive))

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

describe('Menu trigger click', () => {
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
      Program.makeElement(MenuTriggerClickTest, {
        layer: MenuTriggerClickTestLive,
        container,
      }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('actions-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('actions-button'))

      await vi.waitFor(() => {
        expect(
          document
            .getElementById('actions-button')
            ?.getAttribute('aria-expanded'),
        ).toBe('true')
        expect(document.documentElement.style.overflow).toBe('hidden')
        expect(background.inert).toBe(true)
      })

      requireElement('actions-items').dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }),
      )

      await vi.waitFor(() => {
        expect(
          document
            .getElementById('actions-button')
            ?.getAttribute('aria-expanded'),
        ).toBe('false')
        expect(document.documentElement.style.overflow).toBe('')
        expect(background.inert).toBe(false)
      })
    } finally {
      handle.dispose()
    }
  })
})
