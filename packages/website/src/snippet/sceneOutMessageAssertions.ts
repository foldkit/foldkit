import { Effect } from 'effect'
import {
  click,
  expectNoOutMessage,
  expectOutMessage,
  expectOutMessages,
  given,
  role,
  scene,
} from 'foldkit/scene'

import { ApplicationBlock, layer } from './application'
import { TreeRowBlock, layer as TreeRowLayer } from './treeRow'

await Effect.runPromise(
  scene(
    { block: ApplicationBlock, layer },
    given(initialModel),
    click(role('button', { name: 'Log out' })),
    expectOutMessage(OutMessage.RequestedLogout()),
    click(role('button', { name: 'Dismiss notification' })),
    expectNoOutMessage(),
  ),
)

await Effect.runPromise(
  scene(
    { block: TreeRowBlock, layer: TreeRowLayer },
    given(initialModel),
    click(role('button', { name: 'Expand' })),
    expectOutMessages(
      OutMessage.RequestedExpand(),
      OutMessage.RequestedSelection(),
    ),
  ),
)
