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

const mountPopover = (container: HTMLElement, isModal: boolean) => {
  container.id = 'app'
  const tags: Array<string> = []
  const handle = Runtime.embed(
    Runtime.makeElement({
      Model,
      init: () => ({
        model: { popover: init({ id: 'sort', isModal }) },
      }),
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

describe('Popover trigger click', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('treats a same-task click as one open, and still closes when focus leaves', async () => {
    const container = document.createElement('div')
    const outside = document.createElement('button')
    outside.id = 'outside'
    document.body.append(container, outside)
    const { tags, handle } = mountPopover(container, false)

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(tags).toContain('CompletedAnchorPopover')
      })

      expect(tags).toContain('ClickedButton')
      expect(tags).not.toContain('RequestedOpen')
      expect(
        document.getElementById('sort-button')?.getAttribute('aria-expanded'),
      ).toBe('true')

      requireElement('sort-panel').focus()
      outside.focus()

      await vi.waitFor(() => {
        expect(
          document.getElementById('sort-button')?.getAttribute('aria-expanded'),
        ).toBe('false')
      })
      expect(tags).toContain('BlurredPanel')
    } finally {
      handle.dispose()
    }
  })

  it('takes the scroll lock once when a modal popover opens from a same-task click', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const { tags, handle } = mountPopover(container, true)

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('sort-button')).not.toBeNull()
      })

      clickButtonInOneTask(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(tags).toContain('CompletedLockScroll')
      })

      expect(tags.filter(tag => tag === 'CompletedLockScroll')).toHaveLength(1)
      expect(tags.filter(tag => tag === 'CompletedInertOthers')).toHaveLength(1)

      requireElement('sort-panel').dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Escape',
        }),
      )

      await vi.waitFor(() => {
        expect(tags).toContain('CompletedUnlockScroll')
      })
      expect(tags.filter(tag => tag === 'CompletedUnlockScroll')).toHaveLength(
        1,
      )
      expect(tags.filter(tag => tag === 'CompletedRestoreInert')).toHaveLength(
        1,
      )
    } finally {
      handle.dispose()
    }
  })
})
