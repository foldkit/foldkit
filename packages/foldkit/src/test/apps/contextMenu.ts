import { Match as M, Number, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { ts } from '../../schema/index.js'
import { evo } from '../../struct/index.js'

// MODEL

const ContextMenuSource = S.Literals(['Direct', 'Inner', 'Outer'])

const Closed = ts('Closed')
const Open = ts('Open', {
  source: ContextMenuSource,
})

const ContextMenuState = S.Union([Closed, Open])
type ContextMenuState = typeof ContextMenuState.Type

export const Model = S.Struct({
  contextMenu: ContextMenuState,
  openCount: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  OpenedContextMenu: { source: ContextMenuSource },
})
type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({
  contextMenu: Closed(),
  openCount: 0,
})

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<never>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    OpenedContextMenu: ({ source }) => ({
      model: evo(model, {
        contextMenu: () => Open({ source }),
        openCount: Number.increment,
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const contextMenu = M.value(model.contextMenu).pipe(
    M.tagsExhaustive({
      Closed: () => h.empty,
      Open: ({ source }) =>
        h.div(
          [h.Role('menu'), h.AriaLabel(`${source} context menu`)],
          [`${source} context menu opens=${model.openCount}`],
        ),
    }),
  )

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
