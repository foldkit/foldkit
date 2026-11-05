import { Schema } from 'effect'

import { Popover } from '@foldkit/ui'

import { Notification } from '../../domain'

export const Model = Schema.Struct({
  notifications: Schema.Array(Notification),
  now: Schema.Number,
  popover: Popover.PopoverBlock.Model,
})
export type Model = typeof Model.Type
