import { Effect, Layer } from 'effect'

import { Dialog, Listbox } from '@foldkit/ui'

import { CreateIssueBlock } from './block'
import { CreateIssue } from './command'
import {
  DialogBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = CreateIssueBlock.makeLayer(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding
    const projectListbox = yield* ProjectListboxBinding
    const statusListbox = yield* StatusListboxBinding
    const priorityListbox = yield* PriorityListboxBinding

    return {
      children: [dialog, projectListbox, statusListbox, priorityListbox],
      init,
      update,
      inMessageUpdate,
      view,
      EffectsLayer: CreateIssue.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Dialog.layer, Listbox.layer)))
