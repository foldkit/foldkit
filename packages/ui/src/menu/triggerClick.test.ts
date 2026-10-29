import { Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import { makeBlock } from './public.js'

const TestMenu = makeBlock<string>()

const Model = Schema.Struct({ menu: TestMenu.Model })
type Model = typeof Model.Type
const MenuTriggerClickTestDefinition = Block.makeDefinition(
  'MenuTriggerClickTest',
  {
    Model,
    Message: Schema.Never,
  },
)
const foldMenuOutMessage = MenuTriggerClickTestDefinition.makeOutMessageFold(
  TestMenu,
  {
    Selected: () => MenuTriggerClickTestDefinition.makeNoopStep(),
    Closed: () => MenuTriggerClickTestDefinition.makeNoopStep(),
  },
)
const MenuBinding = MenuTriggerClickTestDefinition.makeBinding(TestMenu, {
  field: 'menu',
  init: false,
}).withOutMessagePolicy({ fold: foldMenuOutMessage })
const MenuTriggerClickTestComposition =
  MenuTriggerClickTestDefinition.makeComposition({
    bindings: [MenuBinding],
  })
const view = MenuTriggerClickTestComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        MenuBinding.embedView({
          slotId: 'menu',
          model: model.menu,
          viewInputs: {
            items: ['Name'],
            itemToConfig: item => ({ content: h.span([], [item]) }),
            buttonContent: h.span([], ['Actions']),
            anchor: { placement: 'bottom-start' },
          },
        }),
      ),
    ],
  ),
)
const prepare = () =>
  MenuTriggerClickTestComposition.prepareBlock({
    init: MenuTriggerClickTestComposition.makeInit(() =>
      MenuBinding.init({
        args: [{ id: 'actions', isModal: true }],
        toParentModel: menu => ({ menu }),
      }),
    ),
    update: MenuTriggerClickTestComposition.makeUpdate({}),
    view,
  })
const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

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
      Program.makeElement({ block: ApplicationBlock, container }),
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
