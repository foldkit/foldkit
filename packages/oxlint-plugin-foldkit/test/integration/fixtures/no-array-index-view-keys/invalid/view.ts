import { html } from 'foldkit/html'

import type { Message } from './message'
import type { Task } from './model'

const h = html<Message>()

export const taskList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map((task, index) => h.keyed('li')(index, [], [task.title])),
  )
