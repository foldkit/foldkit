import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import {
  OutMessage,
  Message as PopoverMessage,
  Model as PopoverModel,
  init,
  update,
  view,
} from './public.js'

const Message = defineMessageUnion({
  GotPopoverMessage: { message: PopoverMessage },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  popover: PopoverModel,
})
type Model = typeof Model.Type

const foldPopoverOutMessage = OutMessage.match<Update.Step<Model, Message>>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldPopover = Update.foldChild({
  update,
  read: (model: Model) => Option.some(model.popover),
  write: (model: Model, nextPopover: PopoverModel) =>
    modifyFields(model, { popover: () => nextPopover }),
  toParentMessage: (message: PopoverMessage) =>
    Message.GotPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const popoverView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: 'pop',
        model: model.popover,
        view,
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
                        [h.button([h.Id('item'), h.Type('button')], ['Name'])],
                      ),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message => Message.GotPopoverMessage({ message }),
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

const mountPopover = (container: HTMLElement) => {
  container.id = 'app'
  const tags: Array<string> = []
  const handle = Runtime.embed(
    Runtime.makeElement({
      Model,
      init: () => ({ model: { popover: init({ id: 'sort' }) } }),
      update: (model: Model, message: Message) => {
        tags.push(message.message._tag)
        return Message.match(message, {
          GotPopoverMessage: ({ message: popoverMessage }) =>
            foldPopover(model, popoverMessage),
        })
      },
      view: popoverView,
      container,
    }),
  )

  return { tags, handle }
}

describe('Popover focus leave', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('stays open when focus moves from the panel into its content, and closes when focus leaves', async () => {
    const container = document.createElement('div')
    const outside = document.createElement('button')
    outside.id = 'outside'
    document.body.append(container, outside)
    const { tags, handle } = mountPopover(container)

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

      expect(tags).not.toContain('BlurredPanel')
      expect(document.getElementById('sort-panel')).not.toBeNull()

      outside.focus()

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('false')
      })
      expect(tags).toContain('BlurredPanel')
      expect(document.getElementById('sort-panel')).toBeNull()
    } finally {
      handle.dispose()
    }
  })
})
