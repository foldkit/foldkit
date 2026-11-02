import { Effect, Layer } from 'effect'

import * as Listbox from '@foldkit/ui/listbox'

import * as CommentComposer from '../commentComposer'
import { EffectsLayer } from './command'
import {
  AssigneeListboxBinding,
  CommentComposerBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueDetailDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'
import { view } from './view'

const block = IssueDetailDefinition.makeBlock(
  Effect.gen(function* () {
    const commentComposer = yield* CommentComposerBinding
    const statusListbox = yield* StatusListboxBinding
    const priorityListbox = yield* PriorityListboxBinding
    const projectListbox = yield* ProjectListboxBinding
    const assigneeListbox = yield* AssigneeListboxBinding
    return {
      children: [
        commentComposer,
        statusListbox,
        priorityListbox,
        projectListbox,
        assigneeListbox,
      ],
      init,
      update,
      receive,
      view,
      EffectsLayer,
    }
  }),
).provide(Layer.mergeAll(Listbox.layer, CommentComposer.layer))

export const layer = block.layer
