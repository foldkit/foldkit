import type { Block } from 'foldkit'

import { Popover } from '@foldkit/ui'

import {
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

export const PopoverBinding = makeRequiredFieldBinding(Popover.PopoverBlock, {
  field: 'popover',
  init: {
    contextToArgs: () => [{ id: 'workspace-notifications' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Popover.PopoverBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

export const NotificationCenterComposition = makeComposition({
  bindings: [PopoverBinding],
})
export type NotificationCenterViewBuilder = Block.ViewBuilderFor<
  typeof NotificationCenterComposition
>
