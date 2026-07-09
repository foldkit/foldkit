// main.ts (parent)
import { Array } from 'effect'
import { html } from 'foldkit/html'

import { GotCommandMenuMessage, type Message } from './message'
import type { Model } from './model'
import * as CommandMenu from './page/commandMenu'

const MENU_ITEMS: ReadonlyArray<string> = ['Open', 'Rename', 'Archive']

export const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'command-menu',
    model: model.commandMenu,
    view: CommandMenu.view,
    viewInputs: {
      items: MENU_ITEMS,
      toView: slot =>
        h.div(
          [],
          [
            h.button(
              [...slot.buttonAttributes, h.Class('px-3 py-2 rounded')],
              ['Actions'],
            ),
            ...(slot.isOpen
              ? [
                  h.keyed('div')(
                    'menu',
                    [...slot.menuAttributes, h.Class('mt-2 p-1 bg-gray-50')],
                    Array.map(slot.items, item =>
                      h.keyed('div')(
                        item.id,
                        [
                          ...item.attributes,
                          ...(item.isActive ? [h.Class('bg-blue-50')] : []),
                        ],
                        [item.label],
                      ),
                    ),
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => GotCommandMenuMessage({ message }),
  })
}
