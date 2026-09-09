import { inertHtml as ih } from 'foldkit/html'

import type { Task } from './model'

export const taskList = (tasks: ReadonlyArray<Task>) =>
  ih.ul(
    [],
    tasks.map(task => ih.keyed('li')(task.id, [], [task.title])),
  )
