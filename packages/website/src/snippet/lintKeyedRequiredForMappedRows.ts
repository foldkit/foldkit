import { html } from 'foldkit/html'

const h = html<Message>()

// ❌ Bad
// A mapped row that carries identity must be keyed, or the runtime patches
// surviving rows in place when the list reorders or shrinks.
const badList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task => h.li([], [text(task.title)])),
  )

// ✅ Good
const goodList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task => h.keyed('li')(task.id, [], [text(task.title)])),
  )
