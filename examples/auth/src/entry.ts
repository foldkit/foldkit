import { BrowserKeyValueStore } from '@effect/platform-browser'
import { DataCommand, Runtime } from 'foldkit'

import { execute } from './command'
import { Flags, flags, init } from './main'
import { ChangedUrl, ClickedLink, Message } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const program = DataCommand.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  execute,
  view,
  container: document.getElementById('root'),
  resources: BrowserKeyValueStore.layerLocalStorage,
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  devTools: {
    Message,
  },
})

Runtime.run(program)
