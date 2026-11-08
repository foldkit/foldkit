import type * as Scene from 'foldkit/scene'
import type * as Story from 'foldkit/story'

import {
  sceneInput,
  sceneNavigation,
  sceneOutMessage,
  sceneSubscription,
  sceneSubscriptionGroup,
  storyInput,
  storyMessage,
  storyOutMessage,
  storySubscription,
  storySubscriptionGroup,
  subject,
} from './accepted.js'

export const relocatedStorySteps: ReadonlyArray<Story.Step<typeof subject>> = [
  storyMessage,
  storyInput,
  storyOutMessage,
  storySubscription,
  storySubscriptionGroup,
]

export const relocatedSceneSteps: ReadonlyArray<Scene.Step<typeof subject>> = [
  sceneInput,
  sceneNavigation,
  sceneOutMessage,
  sceneSubscription,
  sceneSubscriptionGroup,
]
