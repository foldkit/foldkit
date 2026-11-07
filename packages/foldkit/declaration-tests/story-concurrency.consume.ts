import * as Story from 'foldkit/story'

import {
  Fetch,
  Message,
  OutMessage,
  concurrentMessages,
  initialModel,
  orderedSceneCommands,
  runConcurrentStory,
  update,
} from './story-concurrency.accepted.js'

const finalModel = runConcurrentStory()
const finalCount: number = finalModel.count

void finalCount
void orderedSceneCommands

Story.story(
  update,
  Story.given(initialModel),
  concurrentMessages,
  Story.Command.expectExactInOrder(
    Fetch({ requestId: 1 }),
    Fetch({ requestId: 2 }),
  ),
  Story.Command.resolveAll(
    [
      Fetch({ requestId: 1 }),
      Message.SucceededFetch({ requestId: 1, count: 10 }),
    ],
    [
      Fetch({ requestId: 2 }),
      Message.SucceededFetch({ requestId: 2, count: 20 }),
    ],
  ),
  Story.message(Message.RequestedReport()),
  Story.expectOutMessage(OutMessage.Reported()),
)
