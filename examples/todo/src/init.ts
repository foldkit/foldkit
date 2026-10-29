import { Option } from 'effect'

import { ApplicationComposition } from './composition'
import type { Flags } from './flags'
import { EditingState, Model } from './model'

export const init = ApplicationComposition.makeInit((flags: Flags) => ({
  model: Model.make({
    todos: Option.getOrElse(flags.todos, () => []),
    newTodoText: '',
    filter: 'All',
    editing: EditingState.NotEditing(),
  }),
}))
