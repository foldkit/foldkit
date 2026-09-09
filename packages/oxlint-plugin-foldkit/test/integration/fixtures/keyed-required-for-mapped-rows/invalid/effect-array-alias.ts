import { map as renderEach } from 'effect/Array'
import type { Html, HtmlBuilder } from 'foldkit/html'

type Task = Readonly<{ id: string }>

export const taskRows = (
  tasks: ReadonlyArray<Task>,
  h: HtmlBuilder<never>,
): ReadonlyArray<Html> =>
  renderEach(tasks, task => h.li([], [task.id]))
