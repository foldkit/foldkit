import { Tuple } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import {
  ChildBlock,
  ChildMessage,
  ChildOutMessage,
  ChildrenBinding,
  RootBlock,
  RootMessage,
  RootOutMessage,
  childLayer,
  childSubscriptions,
  rootLayer,
  sceneInput,
  sceneNavigation,
  sceneSelectedRootSubscription,
  sceneSubscriptionGroup,
  storyInput,
  storySelectedRootSubscription,
  storySubscriptionGroup,
  subject,
} from './accepted.js'

// @ts-expect-error A Story helper retains the root Block's local Message union.
export const wrongStoryMessage: Story.Step<typeof subject> = Story.message(
  ChildMessage.ObservedCount({ count: 1 }),
)

// @ts-expect-error A Scene helper retains the root Block's InMessage union.
export const wrongSceneInput: Scene.Step<typeof subject> = Scene.inMessage(
  RootMessage.Navigated({ path: '/wrong' }),
)

// @ts-expect-error A Story helper retains the root Block's OutMessage union.
export const wrongStoryOutMessage: Story.Step<typeof subject> =
  Story.expectOutMessage(ChildOutMessage.ReportedCount({ count: 1 }))

Story.Subscription.at(
  ChildrenBinding,
  // @ts-expect-error A keyed Story helper retains the Binding's decoded key.
  1,
  childSubscriptions.counts,
)

Scene.Subscription.at(
  ChildrenBinding,
  // @ts-expect-error A keyed Scene helper retains the Binding's decoded key.
  1,
  childSubscriptions.counts,
)

export const subjectWithoutRouting = {
  block: RootBlock,
  layer: rootLayer,
  updateContext: Tuple.make('route:'),
  inMessageContext: Tuple.make(1),
}

// @ts-expect-error A navigation helper retains the Scene subject's routing requirement.
export const missingRouting: Scene.Step<typeof subjectWithoutRouting> =
  sceneNavigation

// @ts-expect-error A selected Subscription helper cannot be widened to the passive Block alone.
export const unselectedStorySubscription: Story.Step<typeof RootBlock> =
  storySelectedRootSubscription

// @ts-expect-error A selected Subscription helper cannot be widened to the passive Block alone.
export const unselectedSceneSubscription: Scene.Step<typeof RootBlock> =
  sceneSelectedRootSubscription

// @ts-expect-error Nested Story groups retain the selected Subscription path.
export const wrongStoryGroupOwner: Story.Step<typeof ChildBlock> =
  storySubscriptionGroup

// @ts-expect-error Nested Scene groups retain the selected Subscription path.
export const wrongSceneGroupOwner: Scene.Step<typeof ChildBlock> =
  sceneSubscriptionGroup

export const childSubject = { block: ChildBlock, layer: childLayer }

// @ts-expect-error A selected helper retains its paired provider and owner evidence.
export const unrelatedSelectedStory: Story.Step<typeof childSubject> =
  storySelectedRootSubscription

// @ts-expect-error A selected helper retains its paired provider and owner evidence.
export const unrelatedSelectedScene: Scene.Step<typeof childSubject> =
  sceneSelectedRootSubscription

export const crossedSubject = { block: RootBlock, layer: childLayer }

// @ts-expect-error An invalid Block/Layer pair cannot broaden a Story step.
export const crossedStorySubject: Story.Step<typeof crossedSubject> = storyInput

// @ts-expect-error An invalid Block/Layer pair cannot broaden a Scene step.
export const crossedSceneSubject: Scene.Step<typeof crossedSubject> = sceneInput

export const invalidSubject = { unrelated: true }

// @ts-expect-error A non-Block subject cannot broaden a Story step.
export const invalidStorySubject: Story.Step<typeof invalidSubject> = storyInput

// @ts-expect-error A non-Block subject cannot broaden a Scene step.
export const invalidSceneSubject: Scene.Step<typeof invalidSubject> = sceneInput

const wrongStoryUpdateContext = Story.story(
  {
    ...subject,
    // @ts-expect-error Extracted helpers do not erase the exact update Context tuple.
    updateContext: [1],
  },
  Story.given({ children: {}, recordedCount: 0 }),
  storyInput,
)

const wrongSceneInMessageContext = Scene.scene(
  {
    ...subject,
    // @ts-expect-error Extracted helpers do not erase the exact InMessage Context tuple.
    inMessageContext: ['wrong'],
  },
  Scene.given({ children: {}, recordedCount: 0 }),
  sceneInput,
)

void RootOutMessage
void wrongStoryUpdateContext
void wrongSceneInMessageContext
