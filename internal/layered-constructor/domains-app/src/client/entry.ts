import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './block'
import { ApplicationLayer } from './services'
import './styles.css'

// NOTE: This preview's SSR client build skips the plugin's automatic HTML injection.
import 'virtual:foldkit-devtools-overlay'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: ApplicationBlock.Message.ClickedLink,
    onUrlChange: ApplicationBlock.Message.ChangedUrl,
  },
  devTools: {
    show: 'Always',
    mode: 'Inspect',
    banner:
      'Built with Foldkit. Select a Message to inspect its Model, Commands, and Mounts while the app stays live.',
    dispatch: true,
  },
}).provide(ApplicationLayer)

Runtime.hydrate(program)
