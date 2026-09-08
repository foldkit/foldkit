// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { HoverIntent } from '@foldkit/ui'

const Model = Schema.Struct({
  hoverMenu: HoverIntent.Model,
  // ...your other fields
})
type Model = typeof Model.Type

const init = () => ({
  model: {
    hoverMenu: HoverIntent.init(),
    // ...your other fields
  },
})

const Message = defineMessageUnion({
  GotHoverMenuMessage: { message: HoverIntent.Message },
  ClickedHoverMenuItem: {},
})
type Message = typeof Message.Type

const foldHoverMenuOutMessage = HoverIntent.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const readHoverMenu = (model: Model) => Option.some(model.hoverMenu)
const writeHoverMenu = (
  model: Model,
  nextHoverMenu: HoverIntent.Model,
): Model => evo(model, { hoverMenu: () => nextHoverMenu })
const toGotHoverMenuMessage = (message: HoverIntent.Message): Message =>
  Message.GotHoverMenuMessage({ message })

const foldHoverMenu = Update.foldChild({
  update: HoverIntent.update,
  read: readHoverMenu,
  write: writeHoverMenu,
  toParentMessage: toGotHoverMenuMessage,
  foldOutMessage: foldHoverMenuOutMessage,
})

// Close the menu immediately when any item is clicked.
const foldHoverMenuClose = Update.foldChildStep({
  update: HoverIntent.close,
  read: readHoverMenu,
  write: writeHoverMenu,
  toParentMessage: toGotHoverMenuMessage,
  foldOutMessage: foldHoverMenuOutMessage,
})

// In the corresponding Message.match handlers:
GotHoverMenuMessage: ({ message }) => foldHoverMenu(model, message)
ClickedHoverMenuItem: () => foldHoverMenuClose(model)

const triggerId = 'actions-trigger'
const panelId = 'actions-panel'

const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'hover-menu',
    model: model.hoverMenu,
    view: HoverIntent.view,
    viewInputs: {
      focusTriggerSelector: `#${triggerId}`,
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [h.Class('relative')],
          [
            h.button(
              [
                ...trigger,
                h.Type('button'),
                h.Id(triggerId),
                h.AriaControls(panelId),
                h.AriaExpanded(isVisible),
              ],
              ['Actions'],
            ),
            ...(isVisible
              ? [
                  h.div(
                    [...panel, h.Id(panelId)],
                    [
                      h.button(
                        [
                          h.Type('button'),
                          h.OnClick(Message.ClickedHoverMenuItem()),
                        ],
                        ['Edit'],
                      ),
                      h.button(
                        [
                          h.Type('button'),
                          h.OnClick(Message.ClickedHoverMenuItem()),
                        ],
                        ['Duplicate'],
                      ),
                      h.button(
                        [
                          h.Type('button'),
                          h.OnClick(Message.ClickedHoverMenuItem()),
                        ],
                        ['Archive'],
                      ),
                    ],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: toGotHoverMenuMessage,
  })
