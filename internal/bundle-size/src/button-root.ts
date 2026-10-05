import { Button } from '@foldkit/ui'

import { Message, runCounter } from './program'

runCounter((model, h) =>
  Button.view(
    {
      onClick: Message.ClickedIncrement(),
      toView: attributes =>
        h.button([...attributes.button], [globalThis.String(model.count)]),
    },
    h,
  ),
)
