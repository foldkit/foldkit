import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true, mode: 'TimeTravel' },
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
})

Runtime.run(program.provide(ApplicationLayer))
