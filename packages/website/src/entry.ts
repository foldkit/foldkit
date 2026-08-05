import { Layer } from 'effect'
import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import {
  type AppManagedResources,
  type AppResources,
  Flags,
  Model,
  devTracerLayer,
  init,
  managedResources,
  subscriptions,
  update,
  view,
} from './main'
import { ChangedUrl, ClickedLink, Message } from './message'
import * as Search from './search'

// NOTE: TS can't infer `Resources`/`ManagedResourceServices` from the
// config object. `update` returns Commands whose requirement is the
// union of every service the app uses, but inference walks the config
// shape, not the Commands inside. The explicit generics tell TS the
// full set so each Command's requirements stay assignable.
const application = Runtime.makeApplication<
  typeof Model.Type,
  Message,
  typeof Flags.Type,
  AppResources,
  AppManagedResources
>({
  Model,
  Flags,
  init,
  update,
  view,
  subscriptions,
  managedResources,
  container: document.getElementById('root'),
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  resources: Layer.mergeAll(Search.PagefindService.Default, devTracerLayer),
  devTools: {
    overlay,
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
    Message,
  },
})

Runtime.hydrate(application)
