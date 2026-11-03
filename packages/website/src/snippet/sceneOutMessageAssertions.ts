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

import { ApplicationBlock } from './application'
import { TreeRowBlock } from './treeRow'

await Effect.runPromise(
  scene(
    ApplicationBlock,
    given(initialModel),
    click(role('button', { name: 'Log out' })),
    expectOutMessage(OutMessage.RequestedLogout()),
    click(role('button', { name: 'Dismiss notification' })),
    expectNoOutMessage(),
  ),
)

await Effect.runPromise(
  scene(
    TreeRowBlock,
    given(initialModel),
    click(role('button', { name: 'Expand' })),
    expectOutMessages(
      OutMessage.RequestedExpand(),
      OutMessage.RequestedSelection(),
    ),
  ),
)
