import { Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { IssueListBlock } from './block'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueListBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(Listbox.layer))
