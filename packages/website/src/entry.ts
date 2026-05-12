import { Layer } from 'effect'
import { Runtime } from 'foldkit'

import {
  Flags,
  Model,
  devTracerLayer,
  flags,
  init,
  subscriptions,
  update,
  view,
} from './main'
import { ChangedUrl, ClickedLink, Message } from './message'
import * as Page from './page'
import * as Search from './search'

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  resources: Layer.mergeAll(
    Page.NotePlayerDemo.AudioContextService.Default,
    Search.PagefindService.Default,
    devTracerLayer,
  ),
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
    Message,
  },
})

Runtime.run(program)
