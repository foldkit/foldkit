import { Option, Schema } from 'effect'
import { Runtime, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { afterEach, expect, vi } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Menu from '../menu/public.js'
import * as Popover from './public.js'

const SortMenu = Menu.create()

const WAIT_OPTIONS = { timeout: 5_000 }

const Message = defineMessageUnion({
  GotPopoverMessage: { message: Popover.Message },
  GotMenuMessage: { message: Menu.Message },
})
type Message = typeof Message.Type

const Model = Schema.Struct({
  popover: Popover.Model,
  menu: Menu.Model,
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
  write: (model: Model, nextPopover: Popover.Model) =>
    modifyFields(model, { popover: () => nextPopover }),
  toParentMessage: (message: Popover.Message) =>
    Message.GotPopoverMessage({ message }),
  foldOutMessage: foldPopoverOutMessage,
})

const foldMenuOutMessage = Menu.OutMessage.match<Update.Step<Model, Message>>({
  Selected: () => model => ({ model }),
})

const foldMenu = Update.foldChild({
  update: SortMenu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model: Model, nextMenu: Menu.Model) =>
    modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: (message: Menu.Message) =>
    Message.GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

const filtersView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div(
    [],
    [
      h.submodel({
        slotId: 'filters',
        model: model.popover,
        view: Popover.view,
        viewInputs: {
          anchor: { placement: 'bottom-start' },
          focusSelector: '#sort-button',
          toView: ({ button, panel, isVisible }) =>
            h.div(
              [],
              [
                h.button([...button], ['Filters']),
                ...(isVisible
                  ? [
                      h.div(
                        [...panel],
                        [
                          h.submodel({
                            slotId: 'sort',
                            model: model.menu,
                            view: SortMenu.view,
                            viewInputs: {
                              items: ['Newest', 'Oldest'],
                              itemToConfig: item => ({
                                content: h.span([], [item]),
                              }),
                              buttonContent: h.span([], ['Sort']),
                              anchor: { portal: false },
                            },
                            toParentMessage: message =>
                              Message.GotMenuMessage({ message }),
                          }),
                        ],
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

const requireElement = (id: string): HTMLElement =>
  Option.getOrThrowWith(
    Option.fromNullishOr(document.getElementById(id)),
    () => new Error(`Missing #${id}`),
  )

const pressEscape = (element: HTMLElement): void => {
  element.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Escape',
    }),
  )
}

const mountFilters = (container: HTMLElement) => {
  container.id = 'app'

  return Runtime.embed(
    Runtime.makeElement({
      Model,
      init: () => ({
        model: {
          popover: Popover.init({ id: 'filters', contentFocus: true }),
          menu: Menu.init({ id: 'sort' }),
        },
      }),
      update: (model: Model, message: Message) =>
        Message.match(message, {
          GotPopoverMessage: ({ message: popoverMessage }) =>
            foldPopover(model, popoverMessage),
          GotMenuMessage: ({ message: menuMessage }) =>
            foldMenu(model, menuMessage),
        }),
      view: filtersView,
      container,
    }),
  )
}

describe('Popover with a Menu in its panel', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('closes one layer for each Escape, the Menu first', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const handle = mountFilters(container)

    try {
      await vi.waitFor(() => {
        expect(document.getElementById('filters-button')).not.toBeNull()
      }, WAIT_OPTIONS)

      requireElement('filters-button').click()

      await vi.waitFor(() => {
        expect(document.activeElement?.id).toBe('sort-button')
      }, WAIT_OPTIONS)

      requireElement('sort-button').click()

      await vi.waitFor(() => {
        expect(document.activeElement?.id).toBe('sort-items')
      }, WAIT_OPTIONS)

      pressEscape(requireElement('sort-items'))

      await vi.waitFor(() => {
        expect(document.getElementById('sort-items')).toBeNull()
      }, WAIT_OPTIONS)

      expect(document.getElementById('filters-panel')).not.toBeNull()
      expect(
        requireElement('filters-button').getAttribute('aria-expanded'),
      ).toBe('true')

      await vi.waitFor(() => {
        expect(document.activeElement?.id).toBe('sort-button')
      }, WAIT_OPTIONS)

      pressEscape(requireElement('sort-button'))

      await vi.waitFor(() => {
        expect(document.getElementById('filters-panel')).toBeNull()
      }, WAIT_OPTIONS)

      expect(
        requireElement('filters-button').getAttribute('aria-expanded'),
      ).toBe('false')
    } finally {
      handle.dispose()
    }
  })
})
