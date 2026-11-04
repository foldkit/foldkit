import { Effect, Layer } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueListBlock } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

export const layer = IssueListBlock.makeLayer(
  Effect.gen(function* () {
    const statusListbox = yield* StatusListboxBinding
    const sortListbox = yield* SortListboxBinding
    const groupListbox = yield* GroupListboxBinding

    return {
      children: [statusListbox, sortListbox, groupListbox],
      init,
      update,
      inMessageUpdate,
      view,
    }
  }),
).pipe(Layer.provide(ListboxLayer))

export { IssueListBlock } from './definition'
