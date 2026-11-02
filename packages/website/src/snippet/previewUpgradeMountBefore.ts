// Before: a Definition-owned Mount, registered on the Composition.
import { Effect } from 'effect'

import { PanelDefinition } from './definition'
import { Message } from './message'

export const MeasurePanel = PanelDefinition.makeMount('MeasurePanel', {
  messages: [Message.CompletedMeasurePanel],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() =>
        Message.CompletedMeasurePanel({
          height: element.getBoundingClientRect().height,
        }),
      )
  },
})

export const PanelComposition = PanelDefinition.makeComposition({
  mounts: [MeasurePanel],
})
