import { Program } from 'foldkit'

import { ApplicationBlock, layer } from './block'

Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})
