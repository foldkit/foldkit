import { Number, Schema } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { evo } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

const ContextMenuSource = Schema.Literals(['Direct', 'Inner', 'Outer'])

const ContextMenuState = defineTaggedUnion({
  Closed: {},
  Open: { source: ContextMenuSource },
})
type ContextMenuState = typeof ContextMenuState.Type

export const Model = Schema.Struct({
  contextMenu: ContextMenuState,
  openCount: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  OpenedContextMenu: { source: ContextMenuSource },
})
type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({
  contextMenu: ContextMenuState.Closed(),
  openCount: 0,
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    OpenedContextMenu: ({ source }) => ({
      model: evo(model, {
        contextMenu: () => ContextMenuState.Open({ source }),
        openCount: Number.increment,
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const contextMenu = ContextMenuState.match(model.contextMenu, {
    Closed: () => h.empty,
    Open: ({ source }) =>
      h.div(
        [h.Role('menu'), h.AriaLabel(`${source} context menu`)],
        [`${source} context menu opens=${model.openCount}`],
      ),
  })

  return h.div(
    [],
    [
      h.section(
        [
          h.AriaLabel('outer context area'),
          h.OnContextMenu(Message.OpenedContextMenu({ source: 'Outer' })),
        ],
        [
          h.span([h.AriaLabel('outer target')], ['Outer target']),
          h.div(
            [
              h.AriaLabel('inner context area'),
              h.OnContextMenu(Message.OpenedContextMenu({ source: 'Inner' })),
            ],
            [
              h.span([h.AriaLabel('nearest target')], ['Nearest target']),
              h.button(
                [
                  h.AriaLabel('direct target'),
                  h.OnContextMenu(
                    Message.OpenedContextMenu({ source: 'Direct' }),
                  ),
                ],
                ['Direct target'],
              ),
            ],
          ),
        ],
      ),
      h.span([h.AriaLabel('no handler')], ['No handler']),
      contextMenu,
    ],
  )
}
