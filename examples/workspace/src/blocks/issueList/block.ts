import { Effect } from 'effect'

import { layer as ListboxLayer } from '@foldkit/ui/listbox'

import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueListDefinition } from './definition'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'
import { view } from './view'

const block = IssueListDefinition.makeBlock(
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
).provide(ListboxLayer)

export const layer = block.layer
