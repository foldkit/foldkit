import { Effect } from 'effect'

import * as Listbox from '@foldkit/ui/listbox'

import {
  GroupListboxBinding,
  SortListboxBinding,
  StatusListboxBinding,
} from './composition'
import { IssueListDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
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
      receive,
      view,
    }
  }),
).provide(Listbox.layer)

export const layer = block.layer
