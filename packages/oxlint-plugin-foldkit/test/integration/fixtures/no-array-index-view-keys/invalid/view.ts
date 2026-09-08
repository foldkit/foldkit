import { createKeyedLazy as makeKeyedLazy, inertHtml as ih } from 'foldkit/html'

import type { Task } from './model'

const lazyTask = makeKeyedLazy()

export const taskList = (tasks: ReadonlyArray<Task>) =>
  ih.ul(
    [],
    tasks.map((task, index) => lazyTask(index, viewTask, task)),
  )
