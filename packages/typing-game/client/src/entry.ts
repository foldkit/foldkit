import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Layer } from 'effect'
import { DataCommand, Runtime } from 'foldkit'

import { execute } from './command'
import { init } from './init'
import { ChangedUrl, ClickedLink, Message } from './message'
import { Model } from './model'
import { RoomsClientLive } from './rpc.js'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

const program = DataCommand.makeProgram({
  Model,
  init,
  update,
  execute,
  view,
  subscriptions,
  container: document.getElementById('root'),
  resources: Layer.merge(
    RoomsClientLive,
    BrowserKeyValueStore.layerSessionStorage,
  ),
  devTools: {
    Message,
    mode: 'TimeTravel',
  },
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(program)
