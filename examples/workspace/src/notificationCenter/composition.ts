import type { Block } from 'foldkit'

import { PopoverBlock } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
} from './definition'

const foldPopoverOutMessage = makeOutMessageFold(PopoverBlock, {
  Opened: makeNoopStep,
  Closed: makeNoopStep,
})

export const PopoverBinding = makeBinding(PopoverBlock, {
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
