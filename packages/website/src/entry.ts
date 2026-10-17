import { Runtime } from 'foldkit'

import { ApplicationComposition } from './composition'
import { Flags } from './flags'
import { init } from './init'
import { EffectsLayer } from './layer'
import { Message } from './message'
import { ApplicationLayer } from './services'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view/view'

const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  subscriptions,
  EffectsLayer,
  Flags,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Select a recorded Message to inspect its payload, Model changes, returned Commands, and Mount activity. Browse earlier states in the timeline. In development, you can pause and resume the view, and AI agents can inspect the history through MCP.',
    Message,
  },
})

Runtime.hydrate(application.provide(ApplicationLayer))
