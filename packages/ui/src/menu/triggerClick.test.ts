import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  Message as MenuMessage,
  Model as MenuModel,
  OutMessage,
  create,
  init,
} from './public.js'

const TestMenu = create<string>()

const Message = defineMessageUnion({
  GotMenuMessage: { message: MenuMessage },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  menu: MenuModel,
})
type Model = typeof Model.Type

const foldMenuOutMessage = OutMessage.match<Update.Step<Model, Message>>({
  Selected: () => model => ({ model }),
})

const foldMenu = Update.foldChild({
  update: TestMenu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model: Model, nextMenu: MenuModel) =>
    modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: (message: MenuMessage) =>
    Message.GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const menuView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: 'menu',
        model: model.menu,
        view: TestMenu.view,
        viewInputs: {
          items: ['Name'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Actions']),
          anchor: { placement: 'bottom-start' },
        },
        toParentMessage: message => Message.GotMenuMessage({ message }),
      }),
    ],
  )

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
  })

  it('treats a same-task click as one open', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    container.id = 'app'
    const tags: Array<string> = []
    const handle = Runtime.embed(
      Runtime.makeElement({
        Model,
        init: () => ({
          model: { menu: init({ id: 'actions', isModal: true }) },
        }),
        update: (model: Model, message: Message) => {
          tags.push(message.message._tag)
          return Message.match(message, {
            GotMenuMessage: ({ message: menuMessage }) =>
              foldMenu(model, menuMessage),
          })
        },
        view: menuView,
        container,
      }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('actions-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('actions-button'))

      await vi.waitFor(() => {
        expect(tags).toContain('CompletedLockScroll')
      })

      expect(tags).toContain('ClickedButton')
      expect(tags).not.toContain('Opened')
      expect(tags.filter(tag => tag === 'CompletedLockScroll')).toHaveLength(1)
      expect(tags.filter(tag => tag === 'CompletedInertOthers')).toHaveLength(1)
      expect(
        document
          .getElementById('actions-button')
          ?.getAttribute('aria-expanded'),
      ).toBe('true')
    } finally {
      handle.dispose()
    }
  })
})
