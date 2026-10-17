// view.ts (parent)
import { Array } from 'effect'

import { ApplicationComposition, CommandMenuBinding } from './composition'

const MENU_ITEMS: ReadonlyArray<string> = ['Open', 'Rename', 'Archive']

export const view = ApplicationComposition.makeView((model, h) =>
  h.block(
    CommandMenuBinding.embedView({
      slotId: 'command-menu',
      model: model.commandMenu,
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
                    h.div(
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
    }),
  ),
)
