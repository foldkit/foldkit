import type { Block } from 'foldkit'

import { Popover } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
} from './block'

const foldPopoverOutMessage = makeOutMessageFold(Popover.PopoverBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
})

export const PopoverBinding = makeBinding(Popover.PopoverBlock, {
  field: 'popover',
  init: {
    contextToArgs: () => [{ id: 'workspace-notifications' }],
  },
}).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const NotificationCenterComposition = makeComposition({
  bindings: [PopoverBinding],
})
export type NotificationCenterViewBuilder = Block.ViewBuilderFor<
  typeof NotificationCenterComposition
>
