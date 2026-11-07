import { Layer } from 'effect'

import { Listbox } from '@foldkit/ui'

import { EducationEntryBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = EducationEntryBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(Listbox.layer)))
