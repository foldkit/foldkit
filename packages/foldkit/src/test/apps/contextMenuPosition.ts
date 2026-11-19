import { Schema } from 'effect'

import {
  type Html,
  type HtmlBuilder,
  PointerPosition,
} from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { defineTaggedUnion } from '../../schema/index.js'
import { modifyFields } from '../../struct/index.js'
import type * as Update from '../../update/index.js'

// MODEL

const BarMenu = defineTaggedUnion({
  Closed: {},
  Open: { position: PointerPosition, isShiftHeld: Schema.Boolean },
})

export const Model = Schema.Struct({
  barMenu: BarMenu,
})
export type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  OpenedBarMenu: { position: PointerPosition, isShiftHeld: Schema.Boolean },
})
type Message = typeof Message.Type

// INIT

export const initialModel = Model.make({
  barMenu: BarMenu.Closed(),
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    OpenedBarMenu: ({ position, isShiftHeld }) => ({
      model: modifyFields(model, {
        barMenu: () => BarMenu.Open({ position, isShiftHeld }),
      }),
    }),
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const barMenu = BarMenu.match(model.barMenu, {
    Closed: () => h.empty,
    Open: ({ position, isShiftHeld }) =>
      h.div(
        [h.Role('menu')],
        [
          `client ${position.clientX},${position.clientY}`,
          ` element ${position.elementX},${position.elementY}`,
          ` size ${position.elementWidth}x${position.elementHeight}`,
          ` shift ${isShiftHeld}`,
        ],
      ),
  })

  return h.div(
    [],
    [
      h.div(
        [
          h.AriaLabel('Assignment bar'),
          h.OnContextMenu((position, { shiftKey }) =>
            Message.OpenedBarMenu({ position, isShiftHeld: shiftKey }),
          ),
        ],
        [h.span([h.AriaLabel('Bar label')], ['Design review'])],
      ),
      barMenu,
    ],
  )
}
