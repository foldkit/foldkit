// ✅ Test the Subscription on the implementation that owns its registry.
import { Effect } from 'effect'
import { Scene } from 'foldkit'

import {
  PinsBlock,
  PinsLayer,
  pinsSubscriptions,
} from './testingMigrationFixture'

await Effect.runPromise(
  Scene.scene(
    { block: PinsBlock, layer: PinsLayer },
    Scene.init(),
    Scene.Subscription.emit(
      pinsSubscriptions.observations,
      PinsBlock.Message.ObservedPins({ count: 3 }),
    ),
    Scene.expect(Scene.role('status')).toHaveText('3'),
  ),
)
