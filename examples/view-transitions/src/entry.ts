import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer, viewTransition } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  viewTransition,
  devTools: { dispatch: true },
})

Runtime.run(program)
