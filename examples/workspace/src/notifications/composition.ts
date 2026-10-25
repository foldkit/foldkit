import type { Block } from 'foldkit'

import { PopoverBlock } from '@foldkit/ui'

import { NotificationCenterDefinition } from './definition'

const foldPopoverOutMessage = NotificationCenterDefinition.makeOutMessageFold(
  PopoverBlock,
  {
    Opened: NotificationCenterDefinition.makeNoopStep,
    Closed: NotificationCenterDefinition.makeNoopStep,
  },
)

export const PopoverBinding = NotificationCenterDefinition.makeBinding(
  PopoverBlock,
  {
    field: 'popover',
    init: {
      contextToArgs: () => [{ id: 'workspace-notifications' }],
    },
  },
).withOutMessagePolicy({ fold: foldPopoverOutMessage })

export const NotificationCenterComposition =
  NotificationCenterDefinition.makeComposition({ bindings: [PopoverBinding] })
export type NotificationCenterViewBuilder = Block.ViewBuilderFor<
  typeof NotificationCenterComposition
>
