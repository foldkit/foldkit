import { html } from 'foldkit/html'

import { ClickedTask } from './message'
import type { Message } from './message'
import type { Task } from './model'

const h = html<Message>()

export const taskList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task =>
      h.li([h.OnClick(ClickedTask({ id: task.id }))], [task.title]),
    ),
  )
