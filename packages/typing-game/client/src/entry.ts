import { Runtime } from 'foldkit'

import { init } from './init'
import { Message } from './message'
import { Model } from './model'
import { RoomsClientLive } from './rpc'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  resources: RoomsClientLive,
  container: document.getElementById('root'),
  devTools: {
    Message,
    mode: 'TimeTravel',
  },
  routing: {
    onUrlRequest: request => Message.ClickedLink({ request }),
    onUrlChange: url => Message.ChangedUrl({ url }),
  },
})

Runtime.run(application)
