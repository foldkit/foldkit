import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'
import './styles.css'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.hydrate(program)
