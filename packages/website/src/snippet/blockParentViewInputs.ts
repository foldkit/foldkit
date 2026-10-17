// view.ts (parent)

import { ApplicationComposition, CommandMenuBinding } from './composition'

const MENU_ITEMS: ReadonlyArray<string> = ['Open', 'Rename', 'Archive']

export const view = ApplicationComposition.makeView((model, h) => ({
  title: 'My App',
  body: h.div(
    [],
    [
      h.block(
        CommandMenuBinding.embedView({
          slotId: 'command-menu',
          model: model.commandMenu,
          viewInputs: {
            buttonLabel: h.span([], ['Actions']),
            items: MENU_ITEMS,
          },
        }),
      ),
    ],
  ),
}))
