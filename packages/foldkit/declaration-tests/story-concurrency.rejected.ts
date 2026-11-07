import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import {
  Fetch,
  Message,
  Model,
  OutMessage,
  initialModel,
  update,
} from './story-concurrency.accepted.js'

Story.story(
  update,
  Story.given(initialModel),
  Story.message(Message.RequestedFetch({ requestId: 1 })),
  // @ts-expect-error A resolver result must belong to its Command Definition.
  Story.Command.resolve(Fetch, Message.ClickedIncrement()),
)

Story.story(
  update,
  // @ts-expect-error The initial Model must belong to the tested update.
  Story.given(Model.make({ count: 'invalid' })),
)

// @ts-expect-error A compared group retains its exact Message type.
const wrongComparedGroup: Story.StoryStep<
  typeof Model.Type,
  typeof Message.Type,
  typeof OutMessage.Type
> = Story.models(
  Story.steps(Story.message(OutMessage.Reported())),
  (before, after) => {
    void before
    void after
  },
)

Story.Command.expectExactInOrder(
  Fetch({ requestId: 1 }),
  // @ts-expect-error Ordered Command assertions accept only Definitions or instances.
  Message.ClickedIncrement(),
)
Scene.Command.expectExactInOrder(
  Fetch({ requestId: 1 }),
  // @ts-expect-error Ordered Scene assertions retain the same Command matcher contract.
  Message.ClickedIncrement(),
)

// @ts-expect-error A Story Message must belong to the tested update.
const wrongMessageStep: Story.StoryStep<
  typeof Model.Type,
  typeof Message.Type,
  typeof OutMessage.Type
> = Story.message(OutMessage.Reported())

// @ts-expect-error An expected OutMessage must belong to the tested update.
const wrongOutMessageStep: Story.StoryStep<
  typeof Model.Type,
  typeof Message.Type,
  typeof OutMessage.Type
> = Story.expectOutMessage(Message.ClickedIncrement())

void wrongMessageStep
void wrongOutMessageStep
void wrongComparedGroup
