import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import { CommentComposer } from './blocks'
import { EffectsLayer } from './command'
import {
  AssigneeListboxBinding,
  CommentComposerBinding,
  PriorityListboxBinding,
  ProjectListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueDetailBlock } from './definition'
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
      EffectsLayer,
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(ListboxLayer, CommentComposer.layer)))

export { IssueDetailBlock } from './definition'
