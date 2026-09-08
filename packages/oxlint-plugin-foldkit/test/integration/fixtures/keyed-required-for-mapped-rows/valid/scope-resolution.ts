import { Option as O } from 'effect'
import type { Html, HtmlBuilder as Builder } from 'foldkit/html'

type Task = Readonly<{ id: string }>

const localRenderer = {
  div: (...values: ReadonlyArray<unknown>) => values,
}

export const maybeTaskRow = (
  maybeTask: O.Option<Task>,
  h: Builder<never>,
): O.Option<Html> => O.map(maybeTask, task => h.div([], [task.id]))

export const localRows = (tasks: ReadonlyArray<Task>) =>
  tasks.map(task => localRenderer.div([], [task.id]))
