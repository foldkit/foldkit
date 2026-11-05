import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { IssueDetailBlock } from './block'
import { CommentComposer } from './blocks'
import { SaveIssue } from './command'
import {
  AssigneeListboxBinding,
  CommentComposerBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueDetailBlock.makeLayer(
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
      inMessageUpdate,
      view,
      EffectsLayer: SaveIssue.layer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer, CommentComposer.layer)))
