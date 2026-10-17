import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  Message as ListboxMessage,
  Model as ListboxModel,
  OutMessage,
  create,
  init,
} from './public.js'

const TestListbox = create<string>()

const Message = defineMessageUnion({
  GotListboxMessage: { message: ListboxMessage },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  listbox: ListboxModel,
})
type Model = typeof Model.Type

const foldListboxOutMessage = OutMessage.match<Update.Step<Model, Message>>({
  Selected: () => model => ({ model }),
})

const foldListbox = Update.foldChild({
  update: TestListbox.update,
  read: (model: Model) => Option.some(model.listbox),
  write: (model: Model, nextListbox: ListboxModel) =>
    modifyFields(model, { listbox: () => nextListbox }),
  toParentMessage: (message: ListboxMessage) =>
    Message.GotListboxMessage({ message }),
  foldOutMessage: foldListboxOutMessage,
})

const listboxView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: 'listbox',
        model: model.listbox,
        view: TestListbox.view,
        viewInputs: {
          items: ['Name'],
          itemToConfig: item => ({ content: h.span([], [item]) }),
          buttonContent: h.span([], ['Sort']),
          maybeSelectedValue: Option.none(),
          anchor: { placement: 'bottom-start' },
        },
        toParentMessage: message => Message.GotListboxMessage({ message }),
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

describe('Listbox trigger click', () => {
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
          model: { listbox: init({ id: 'sort', isModal: true }) },
        }),
        update: (model: Model, message: Message) => {
          tags.push(message.message._tag)
          return Message.match(message, {
            GotListboxMessage: ({ message: listboxMessage }) =>
              foldListbox(model, listboxMessage),
          })
        },
        view: listboxView,
        container,
      }),
    )

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(tags).toContain('CompletedLockScroll')
      })

      expect(tags).toContain('ClickedButton')
      expect(tags).not.toContain('Opened')
      expect(tags.filter(tag => tag === 'CompletedLockScroll')).toHaveLength(1)
      expect(tags.filter(tag => tag === 'CompletedInertOthers')).toHaveLength(1)
      expect(
        document.getElementById('sort-button')?.getAttribute('aria-expanded'),
      ).toBe('true')
    } finally {
      handle.dispose()
    }
  })
})
