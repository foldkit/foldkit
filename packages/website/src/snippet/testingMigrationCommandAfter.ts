// ✅ Match the original Definition and supply the child's raw result.
import { Effect } from 'effect'
import { Command, init, message, story } from 'foldkit/story'

import {
  ApplicationBlock,
  Message,
  PinsBlock,
  ReadPins,
} from './testingMigrationFixture'

await Effect.runPromise(
  story(
    ApplicationBlock,
    init(),
    message(Message.RequestedRefreshPins()),
    Command.expectHas(ReadPins),
    Command.resolve(
      ReadPins,
      PinsBlock.Message.CompletedReadPins({ count: 3 }),
    ),
  ),
)
