import { Layer } from 'effect'

import { Dialog, Listbox } from '@foldkit/ui'

import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = CreateIssueBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: CreateIssue.layer,
}).pipe(Layer.provide(Layer.mergeAll(Dialog.layer, Listbox.layer)))
