import { Program, Runtime } from 'foldkit'

import { ApplicationBlock, layer } from './block'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  viewTransition: ({ message }) => message._tag === 'ChangedUrl',
})

Runtime.run(program)
