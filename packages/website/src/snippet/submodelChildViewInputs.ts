// page/commandMenu.ts
import { Array } from 'effect'
import { Submodel } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import { ClosedMenu, type Message, OpenedMenu, SelectedItem } from './message'
import type { Model } from './model'

// The third type parameter to defineView is `ViewInputs`: per-render
// data the parent passes alongside the model. Here, the parent supplies
// the trigger content and the items; the child supplies the open/closed
// state and the selection behavior.
export type ViewInputs = Readonly<{
  buttonLabel: Html
  items: ReadonlyArray<string>
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()
    const toggleMessage = model.isOpen ? ClosedMenu() : OpenedMenu()

    return h.div(
      [],
      [
        h.button([h.OnClick(toggleMessage)], [viewInputs.buttonLabel]),
        ...(model.isOpen
          ? [
              h.keyed('div')(
                'menu',
                [h.Role('menu')],
                Array.map(viewInputs.items, (label, index) =>
                  h.keyed('div')(
                    label,
                    [
                      h.Role('menuitem'),
                      h.OnClick(SelectedItem({ index, label })),
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
