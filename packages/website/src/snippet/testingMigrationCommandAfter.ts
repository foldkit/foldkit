// ✅ Match the original Definition and supply the child's raw result.
import { Effect } from 'effect'
import { Story } from 'foldkit'

import {
  ApplicationBlock,
  Message,
  PinsBlock,
  ReadPins,
  layer,
} from './testingMigrationFixture'

await Effect.runPromise(
  Story.story(
    { block: ApplicationBlock, layer },
    Story.init(),
    Story.message(Message.RequestedRefreshPins()),
    Story.Command.expectHas(ReadPins),
    Story.Command.resolve(
      ReadPins,
      PinsBlock.Message.CompletedReadPins({ count: 3 }),
    ),
  ),
)
