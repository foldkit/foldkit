import { Layer } from 'effect'
import { Runtime } from 'foldkit'

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
import { Message } from './message'
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
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
  resources: Layer.mergeAll(Search.PagefindService.Default, devTracerLayer),
  devTools: {
    show: 'Always',
    mode: { development: 'TimeTravel', production: 'Inspect' },
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit. Navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
    Message,
  },
})

Runtime.hydrate(application, { buildId: import.meta.env.FOLDKIT_BUILD_ID })
