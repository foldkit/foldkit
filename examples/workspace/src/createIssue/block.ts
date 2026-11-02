import { Effect, Layer } from 'effect'

import * as Dialog from '@foldkit/ui/dialog'
import * as Listbox from '@foldkit/ui/listbox'

import { CreateIssue } from './command'
import {
  DialogBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { CreateIssueDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

const block = CreateIssueDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding
    const projectListbox = yield* ProjectListboxBinding
    const statusListbox = yield* StatusListboxBinding
    const priorityListbox = yield* PriorityListboxBinding
    return {
      children: [dialog, projectListbox, statusListbox, priorityListbox],
      init,
      update,
      receive,
      view,
      EffectsLayer: CreateIssue.layer,
    }
  }),
).provide(Layer.mergeAll(Dialog.layer, Listbox.layer))

export const layer = block.layer
