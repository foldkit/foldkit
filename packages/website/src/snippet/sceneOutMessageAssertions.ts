import { Effect } from 'effect'
import { Scene } from 'foldkit'

import { ApplicationBlock, layer } from './block'
import { TreeRowBlock, layer as TreeRowLayer } from './treeRow'

await Effect.runPromise(
  Scene.scene(
    { block: ApplicationBlock, layer },
    Scene.given(initialModel),
    Scene.click(Scene.role('button', { name: 'Log out' })),
    Scene.expectOutMessage(OutMessage.RequestedLogout()),
    Scene.click(Scene.role('button', { name: 'Dismiss notification' })),
    Scene.expectNoOutMessage(),
  ),
)

await Effect.runPromise(
  Scene.scene(
    { block: TreeRowBlock, layer: TreeRowLayer },
    Scene.given(initialModel),
    Scene.click(Scene.role('button', { name: 'Expand' })),
    Scene.expectOutMessages(
      OutMessage.RequestedExpand(),
      OutMessage.RequestedSelection(),
    ),
  ),
)
