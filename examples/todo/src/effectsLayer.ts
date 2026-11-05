import { Layer } from 'effect'

import { GenerateTodo, SaveTodos } from './command'

export const EffectsLayer = Layer.mergeAll(GenerateTodo.layer, SaveTodos.layer)
