import { html } from 'foldkit/html'

import { ClickedTask } from './message'
import type { Message } from './message'
import type { Task } from './model'

const h = html<Message>()

// The h.Key attribute form keys the row exactly like the keyed wrapper does.
export const taskListByAttribute = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task =>
      h.li(
        [h.Key(task.id), h.OnClick(ClickedTask({ id: task.id }))],
        [task.title],
      ),
    ),
  )

// A row that destructures only display fields has no identity to key by.
export const displayOnlyList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(({ title }) => h.li([], [title])),
  )
