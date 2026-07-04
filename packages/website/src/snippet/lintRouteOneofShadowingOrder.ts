import { pipe } from 'effect'
import { literal, mapTo, oneOf, slash, string } from 'foldkit/route'

const taskRouter = pipe(literal('tasks'), slash(string('id')), mapTo(TaskRoute))
const taskArchiveRouter = pipe(
  literal('tasks'),
  slash(literal('archive')),
  mapTo(TaskArchiveRoute),
)

// ❌ Bad
// taskRouter matches /tasks/anything first, so taskArchiveRouter can never win.
oneOf(taskRouter, taskArchiveRouter)

// ✅ Good
// Put the more specific Router first.
oneOf(taskArchiveRouter, taskRouter)
