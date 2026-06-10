import { BrowserKeyValueStore } from '@effect/platform-browser'
import { DataCommand, Runtime } from 'foldkit'

import {
  Flags,
  Message,
  Model,
  execute,
  flags,
  init,
  update,
  view,
} from './main'

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
  devTools: {
    Message,
  },
})

Runtime.run(program)
