import { modifyFields } from 'foldkit/struct'

import { GRID_SIZE } from './constants'
import { Message } from './message'
import type { Model } from './model'

// ❌ Don't call random directly in update
const update = ApplicationComposition.makeUpdate({
  RequestedApple: model => {
    const x = Math.floor(Math.random() * GRID_SIZE)
    const y = Math.floor(Math.random() * GRID_SIZE)
    return { model: modifyFields(model, { apple: () => ({ x, y }) }) }
  },
})
