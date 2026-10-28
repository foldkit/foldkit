import { Array, Schema } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'

import { DragAndDrop } from '@foldkit/ui'

const ScheduleCell = Schema.Struct({
  id: Schema.String,
  tasks: Schema.Array(
    Schema.Struct({ id: Schema.String, title: Schema.String }),
  ),
})
type ScheduleCell = typeof ScheduleCell.Type

const scheduleCell = (
  model: Model,
  h: HtmlBuilder<Message>,
  cell: ScheduleCell,
) =>
  h.td(
    [
      ...DragAndDrop.droppable(cell.id, undefined, { role: 'Native' }),
      h.Class('h-24 p-2 align-top'),
    ],
    Array.map(cell.tasks, (task, index) =>
      h.keyed('button')(
        task.id,
        [
          ...DragAndDrop.draggable(
            {
              model: model.dragAndDrop,
              toParentMessage: message =>
                Message.GotDragAndDropMessage({ message }),
              itemId: task.id,
              containerId: cell.id,
              index,
              role: 'Native',
            },
            h,
          ),
          h.Type('button'),
          h.Class('block w-full rounded border p-2 text-left'),
        ],
        [task.title],
      ),
    ),
  )
