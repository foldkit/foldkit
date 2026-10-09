import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, it, vi } from 'vitest'

import * as Popover from './index.js'

const PORTAL_ROOT_ID = 'foldkit-portal-root'
const POPOVER_ID = 'sort'

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

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.main(
    [h.Id('page')],
    [
      h.submodel({
        slotId: 'pop',
        model: model.popover,
        view: Popover.view,
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
                      h.div([...panel], [h.button([h.Id('item')], ['Name'])]),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message => Message.GotPopoverMessage({ message }),
      }),
    ],
  )

const mount = (container: HTMLElement) =>
  Runtime.embed(
    Runtime.makeElement({
      Model,
      init: () => ({
        model: {
          popover: Popover.init({ id: POPOVER_ID, isModal: true }),
        },
      }),
      update: (model: Model, message: Message) =>
        Message.match(message, {
          GotPopoverMessage: ({ message: popoverMessage }) =>
            foldPopover(model, popoverMessage),
        }),
      view,
      container,
    }),
  )

const inertAncestorId = (element: Element | null): string => {
  for (
    let node = element?.parentElement ?? null;
    node !== null;
    node = node.parentElement
  ) {
    if (node.inert || node.hasAttribute('inert')) {
      return node.id === '' ? node.tagName : node.id
    }
  }

  return 'none'
}

afterEach(() => {
  document.body.replaceChildren()
  document.documentElement.style.overflow = ''
})

it('keeps a modal Popover panel usable on the second open', async () => {
  const container = document.createElement('div')
  container.id = 'app'
  document.body.append(container)
  const handle = mount(container)
  const button = () => document.getElementById(`${POPOVER_ID}-button`)
  const panel = () => document.getElementById(`${POPOVER_ID}-panel`)

  try {
    await vi.waitFor(() => expect(button()).not.toBeNull())

    button()?.click()
    await vi.waitFor(() =>
      expect(panel()?.parentElement?.id).toBe(PORTAL_ROOT_ID),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[inert]')).not.toBeNull(),
    )
    await vi.waitFor(() =>
      expect(document.activeElement?.id).toBe(`${POPOVER_ID}-panel`),
    )
    expect(inertAncestorId(panel())).toBe('none')
    expect(document.getElementById(PORTAL_ROOT_ID)?.inert).toBe(false)

    button()?.click()
    await vi.waitFor(() => expect(panel()).toBeNull())
    await vi.waitFor(() => expect(document.querySelector('[inert]')).toBeNull())
    expect(document.getElementById(PORTAL_ROOT_ID)).toBeNull()

    button()?.click()
    await vi.waitFor(() =>
      expect(panel()?.parentElement?.id).toBe(PORTAL_ROOT_ID),
    )
    await vi.waitFor(() =>
      expect(document.querySelector('[inert]')).not.toBeNull(),
    )
    await vi.waitFor(() =>
      expect(document.activeElement?.id).toBe(`${POPOVER_ID}-panel`),
    )
    expect(inertAncestorId(panel())).toBe('none')
    expect(document.getElementById(PORTAL_ROOT_ID)?.inert).toBe(false)
  } finally {
    handle.dispose()
  }
})
