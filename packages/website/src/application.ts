import { Application } from 'foldkit'

import {
  Flags,
  Model,
  init,
  managedResources,
  subscriptions,
  update,
  view,
} from './main'
import { Message } from './message'
import { Example, Playground } from './page'
import * as SnippetDisclosure from './snippetDisclosure'

export const application = Application.make({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  managedResources,
  mounts: [
    SnippetDisclosure.MeasureSnippetHeight,
    ...Playground.mounts,
    ...Example.mounts,
  ],
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
    Message,
  },
})
