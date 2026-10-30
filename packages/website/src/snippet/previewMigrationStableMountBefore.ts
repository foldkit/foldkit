// Stable before: the Mount owns the Effect that runs on each element.
import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { Message } from './message'

export const MeasurePanel = Mount.define('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
  execute: ({ element }) =>
    Effect.sync(() =>
      Message.CompletedMeasurePanel({
        height: element.getBoundingClientRect().height,
      }),
    ),
})
