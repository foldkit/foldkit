import type { Html, HtmlBuilder as Builder } from 'foldkit/html'

type Task = Readonly<{ id: string }>

const Option = {
  map: <Value, Result>(
    values: ReadonlyArray<Value>,
    toResult: (value: Value) => Result,
  ): ReadonlyArray<Result> => values.map(toResult),
}

export const taskRows = (
  tasks: ReadonlyArray<Task>,
  h: Builder<never>,
): ReadonlyArray<Html> =>
  Option.map(tasks, task => h.li([], [task.id]))
