import type { Block } from 'foldkit'

import { PopoverBlock } from '@foldkit/ui'

import { NotificationCenterDefinition, makeNoopStep } from './definition'

const foldPopoverOutMessage = NotificationCenterDefinition.makeOutMessageFold(
  PopoverBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
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
