import { Effect } from 'effect'

import {
  ApplicationBlock,
  ApplicationComposition,
  init,
  update,
} from './application'
import { view } from './view.optimised'

export { ApplicationBlock } from './application'

export const layer = ApplicationBlock.makeLayer(
  Effect.succeed({
    children: [],
    init,
    update,
    view: ApplicationComposition.makeView(view),
  }),
)
