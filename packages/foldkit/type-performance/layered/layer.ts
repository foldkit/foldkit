import { Layer } from 'effect'

import { ApplicationBlock } from './block.js'
import { layer as editorLayer } from './editor.js'
import { init } from './init.js'
import { countedUpdate } from './update.js'
import { view } from './view.js'

export const layer = ApplicationBlock.makeLayer({
  init,
  update: countedUpdate,
  view,
}).pipe(Layer.provide(editorLayer))
