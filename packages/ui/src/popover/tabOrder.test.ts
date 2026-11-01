import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, it, vi } from 'vitest'

import * as Popover from './index.js'

const Message = defineMessageUnion({
  GotPopoverMessage: { message: Popover.Message },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  popover: Popover.Model,
})
type Model = typeof Model.Type

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldPopover = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popover),
  write: (model, popover) => modifyFields(model, { popover: () => popover }),
  toParentMessage: (message: Popover.Message): Message =>
    Message.GotPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const view = (model: Model, h: HtmlBuilder<Message>, portal: boolean): Html =>
  h.main(
    [h.Id('page')],
    [
      h.a([h.Id('first-link'), h.Href('#top')], ['First link on the page']),
      h.submodel({
        slotId: 'pop',
        model: model.popover,
        view: Popover.view,
        viewInputs: {
          anchor: { placement: 'bottom-start', portal },
          focusSelector: '#first',
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
                          h.button([h.Id('first')], ['First']),
                          h.button([h.Id('last')], ['Last']),
                        ],
                      ),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message => Message.GotPopoverMessage({ message }),
      }),
      h.button([h.Id('after-trigger')], ['Control after the trigger']),
    ],
  )

const mount = (container: HTMLElement, portal: boolean) =>
  Runtime.embed(
    Runtime.makeElement({
      Model,
      init: () => ({
        model: {
          popover: Popover.init({ id: 'sort', contentFocus: true }),
        },
      }),
      update: (model: Model, message: Message) =>
        Message.match(message, {
          GotPopoverMessage: ({ message: popoverMessage }) =>
            foldPopover(model, popoverMessage),
        }),
      view: (model, h) => view(model, h, portal),
      container,
    }),
  )

const elementById = (id: string): HTMLElement => {
  const element = document.getElementById(id)

  if (!(element instanceof HTMLElement)) {
    throw new Error(`missing #${id}`)
  }

  return element
}

const pressTab = (element: HTMLElement, shiftKey: boolean): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
    shiftKey,
  })
  element.dispatchEvent(event)
  return event
}

const openAndFocusFirst = async (): Promise<void> => {
  elementById('sort-button').dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }),
  )
  await vi.waitFor(() => expect(document.activeElement?.id).toBe('first'))
}

afterEach(() => {
  document.body.replaceChildren()
})

it('continues Tab from a portaled Popover panel after the trigger', async () => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.append(container)
  const handle = mount(container, true)

  try {
    await vi.waitFor(() =>
      expect(document.getElementById('sort-button')).toBeInstanceOf(
        HTMLElement,
      ),
    )
    await openAndFocusFirst()

    elementById('last').focus()
    pressTab(elementById('last'), false)
    expect(document.activeElement?.id).toBe('after-trigger')

    elementById('first').focus()
    pressTab(elementById('first'), true)
    expect(document.activeElement?.id).toBe('sort-button')

    pressTab(elementById('sort-button'), false)
    expect(document.activeElement?.id).toBe('first')

    elementById('first').focus()
    const middleTab = pressTab(elementById('first'), false)
    expect(middleTab.defaultPrevented).toBe(false)
    expect(document.activeElement?.id).toBe('first')
  } finally {
    handle.dispose()
  }
})

it('leaves Tab alone when the Popover panel is not portaled', async () => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.append(container)
  const handle = mount(container, false)

  try {
    await vi.waitFor(() =>
      expect(document.getElementById('sort-button')).toBeInstanceOf(
        HTMLElement,
      ),
    )
    await openAndFocusFirst()

    elementById('last').focus()
    const tabFromLast = pressTab(elementById('last'), false)
    expect(tabFromLast.defaultPrevented).toBe(false)
    expect(document.activeElement?.id).toBe('last')

    elementById('sort-button').focus()
    const tabFromTrigger = pressTab(elementById('sort-button'), false)
    expect(tabFromTrigger.defaultPrevented).toBe(false)
    expect(document.activeElement?.id).toBe('sort-button')
  } finally {
    handle.dispose()
  }
})
