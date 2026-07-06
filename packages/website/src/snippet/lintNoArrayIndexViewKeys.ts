import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// The array index is not a stable identity: reordering patches the wrong rows.
const badList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map((task, index) => h.keyed('li')(index, [], [text(task.title)])),
  )

// ✅ Good
// Key by a stable Model identifier.
const goodList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task => h.keyed('li')(task.id, [], [text(task.title)])),
  )
