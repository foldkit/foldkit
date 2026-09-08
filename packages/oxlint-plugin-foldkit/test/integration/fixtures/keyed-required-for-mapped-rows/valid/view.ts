import type { Html, HtmlBuilder } from 'foldkit/html'

import { ClickedTask } from './message'
import type { Message } from './message'
import type { Task } from './model'

export const taskList = (
  tasks: ReadonlyArray<Task>,
  h: HtmlBuilder<Message>,
): Html =>
  h.ul(
    [],
    tasks.map(task =>
      h.keyed('li')(
        task.id,
        [h.OnClick(ClickedTask({ id: task.id }))],
        [task.title],
      ),
    ),
  )
