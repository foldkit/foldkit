import { Schema } from 'effect'

import {
  GroupListboxBlock,
  SortListboxBlock,
  StatusFilterListboxBlock,
} from '../listbox'

export const Model = Schema.Struct({
  savedViewName: Schema.String,
  statusListbox: StatusFilterListboxBlock.Model,
  sortListbox: SortListboxBlock.Model,
  groupListbox: GroupListboxBlock.Model,
})
