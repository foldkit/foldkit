import { Effect } from 'effect'
import { __setDevToolsOverlay } from 'foldkit/devtools-host'

import { Message, runCounter } from './program'

__setDevToolsOverlay(() => Effect.void)

runCounter(
  (model, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [globalThis.String(model.count)],
    ),
  { show: 'Always', Message },
)
