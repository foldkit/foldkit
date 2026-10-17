import { Effect, Fiber, Option, Schema } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Runtime from 'foldkit/runtime'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as Popover from './index.js'

const popoverId = 'badge-popover'
const portalRootId = 'foldkit-portal-root'

const Model = Schema.Struct({
  popover: Popover.Model,
  isBadgeShown: Schema.Boolean,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotPopoverMessage: { message: Popover.Message },
  ClickedToggleBadge: {},
})
type Message = typeof Message.Type

const foldPopoverOutMessage = Popover.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const foldPopover = Update.foldChild({
  update: Popover.update,
  read: (model: Model) => Option.some(model.popover),
  write: (model, nextPopover) =>
    modifyFields(model, { popover: () => nextPopover }),
  toParentMessage: message => Message.GotPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPopoverMessage: ({ message: popoverMessage }) =>
      foldPopover(model, popoverMessage),
    ClickedToggleBadge: () => ({
      model: modifyFields(model, { isBadgeShown: isShown => !isShown }),
    }),
  })

const view = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.main(
    [],
    [
      h.button(
        [h.Id('toggle-badge'), h.OnClick(Message.ClickedToggleBadge())],
        ['Toggle badge'],
      ),
      h.submodel({
        slotId: popoverId,
        model: model.popover,
        view: Popover.view,
        viewInputs: {
          anchor: { placement: 'bottom-start' },
          toView: ({ button, panel, isVisible }) =>
            h.div(
              [h.Id('wrapper')],
              [
                h.button([...button], ['Open']),
                ...(model.isBadgeShown ? [h.span([h.Id('badge')], ['!'])] : []),
                ...(isVisible ? [h.div([...panel], ['Panel content'])] : []),
              ],
            ),
        },
        toParentMessage: message => Message.GotPopoverMessage({ message }),
      }),
    ],
  )

describe('Popover with a portaled panel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('renders a sibling that appears before the open panel', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    container.id = 'badge-popover-app'
    document.body.append(container)

    const program = Runtime.makeElement({
      Model,
      init: () => ({
        model: {
          popover: Popover.init({ id: popoverId }),
          isBadgeShown: false,
        },
      }),
      update,
      view,
      container,
    })
    const runtime = Effect.runFork(program.start())

    try {
      await vi.waitFor(() => {
        expect(document.getElementById(Popover.buttonId(popoverId))).not.toBe(
          null,
        )
      })
      document.getElementById(Popover.buttonId(popoverId))?.click()

      await vi.waitFor(() => {
        expect(
          document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
        ).toBe(portalRootId)
      })
      document.getElementById('toggle-badge')?.click()

      await vi.waitFor(() => {
        expect(document.getElementById('badge')?.parentElement?.id).toBe(
          'wrapper',
        )
      })
      expect(
        document.getElementById(`${popoverId}-panel`)?.parentElement?.id,
      ).toBe(portalRootId)
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      await Effect.runPromise(Fiber.interrupt(runtime))
    }
  })
})
