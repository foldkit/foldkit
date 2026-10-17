// page/commandMenu.ts
import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import { CommandMenuComposition } from './definition'
import { Message } from './message'

export type ViewInputs = Readonly<{
  buttonLabel: Html
  items: ReadonlyArray<string>
}>

export const view = CommandMenuComposition.makeView.withInputs<ViewInputs>(
  (model, viewInputs, h) => {
    const toggleMessage = model.isOpen
      ? Message.ClosedMenu()
      : Message.OpenedMenu()

    return h.div(
      [],
      [
        h.button([h.OnClick(toggleMessage)], [viewInputs.buttonLabel]),
        ...(model.isOpen
          ? [
              h.div(
                [h.Role('menu')],
                Array.map(viewInputs.items, (label, index) =>
                  h.keyed('div')(
                    label,
                    [
                      h.Role('menuitem'),
                      h.OnClick(Message.SelectedItem({ index, label })),
                    ],
                    [label],
                  ),
                ),
              ),
            ]
          : []),
      ],
    )
  },
)
