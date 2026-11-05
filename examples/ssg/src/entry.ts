import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'
import './styles.css'

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

Runtime.hydrate(program)
