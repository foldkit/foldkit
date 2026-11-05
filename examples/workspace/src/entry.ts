import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './index'
import { AppLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  devTools: { dispatch: true },
})

Runtime.run(program.provide(AppLayer))
