import type { HtmlBuilder } from 'foldkit/html'

// ❌ Bad
// The row carries the task's identity (its id), so leaving it unkeyed lets the
// runtime patch the wrong row when the list reorders or shrinks.
const badList = (tasks: ReadonlyArray<Task>, h: HtmlBuilder<Message>) =>
  h.ul(
    [],
    tasks.map(task =>
      h.li([h.OnClick(ClickedTask({ id: task.id }))], [task.title]),
    ),
  )

// ✅ Good
const goodList = (tasks: ReadonlyArray<Task>, h: HtmlBuilder<Message>) =>
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
