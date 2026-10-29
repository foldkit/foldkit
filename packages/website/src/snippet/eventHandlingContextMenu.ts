import { Number, Option, Schema, pipe } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  OpenedTaskMenu: {
    taskId: Schema.String,
    weekIndex: Schema.Int,
    clientX: Schema.Finite,
    clientY: Schema.Finite,
  },
})
type Message = typeof Message.Type

const weekIndexAt = (
  elementX: number,
  elementWidth: number,
  weekCount: number,
): number =>
  pipe(
    Number.divide(elementX, elementWidth),
    Option.map(fraction =>
      Number.clamp(Math.floor(fraction * weekCount), {
        minimum: 0,
        maximum: weekCount - 1,
      }),
    ),
    Option.getOrElse(() => 0),
  )

const taskBar = (taskId: string, weekCount: number, h: HtmlBuilder<Message>) =>
  h.div(
    [
      h.Class('task-bar'),
      h.OnContextMenu(({ clientX, clientY, elementX, elementWidth }) =>
        Message.OpenedTaskMenu({
          taskId,
          weekIndex: weekIndexAt(elementX, elementWidth, weekCount),
          clientX,
          clientY,
        }),
      ),
    ],
    [taskId],
  )
