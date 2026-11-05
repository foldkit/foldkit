import { Program, Runtime } from 'foldkit'

import { Flags } from './flags'
import { ApplicationBlock, layer } from './index'
import { ApplicationLayer } from './services'

const program = Program.make({
  block: ApplicationBlock,
  layer,
  Flags,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Select a recorded Message to inspect its payload, Model changes, returned Commands, and Mount activity. Browse earlier states in the timeline. In development, you can pause and resume the view, and AI agents can inspect the history through MCP.',
    dispatch: true,
  },
})

Runtime.hydrate(program.provide(ApplicationLayer))
