import type { Effect } from 'effect'

import * as CoreStory from '../../../test/story.js'
import { resolveInMessageSteps } from './inMessage.js'
import { resolveStorySteps } from './messageFrom.js'
import type {
  DirectSubject,
  TestConfig,
  TestInMessage,
  TestInit,
  TestMessage,
  TestModel,
  TestOutMessage,
  TestSubject,
} from './subject.js'
import {
  initialStep,
  subjectBlock,
  subjectReceive,
  subjectUpdate,
} from './subject.js'
import { type BlockSubject, type TestEffect, withBlock } from './withBlock.js'

export * from '../../../test/story.js'
export { type InitStep, init } from './initialState.js'
export { messageFrom } from './messageFrom.js'
export { type InMessageStep, inMessage } from './inMessage.js'

type InitialState<Block extends BlockSubject> =
  | TestInit<Block>
  | CoreStory.GivenStep<TestModel<Block>>

type Step<Block extends BlockSubject> = CoreStory.StoryStep<
  TestModel<Block>,
  TestMessage<Block>,
  TestOutMessage<Block>,
  TestInMessage<Block>
>

/**
 * Acquires one Block graph and runs ordinary synchronous Story steps. Default
 * Layers are scoped to the test; provided implementation Layers retain their
 * ordinary sharing and lifetime. `init(...)`
 * retains startup Commands; `given(model)` supplies state
 * without running init. Handler Layers are not built.
 *
 * Provide implementation Layers and constructor Services through ordinary
 * `Effect.provide`.
 */
export function story<const Block extends BlockSubject>(
  block: DirectSubject<Block>,
  initial: InitialState<NoInfer<Block>>,
  ...steps: ReadonlyArray<Step<NoInfer<Block>>>
): Effect.Effect<
  void,
  Effect.Error<TestEffect<Block, void>>,
  Effect.Services<TestEffect<Block, void>>
>
export function story<const Block extends BlockSubject>(
  config: TestConfig<Block>,
  initial: InitialState<NoInfer<Block>>,
  ...steps: ReadonlyArray<Step<NoInfer<Block>>>
): Effect.Effect<
  void,
  Effect.Error<TestEffect<Block, void>>,
  Effect.Services<TestEffect<Block, void>>
>
export function story(
  subject: TestSubject,
  initial: unknown,
  ...steps: ReadonlyArray<unknown>
): Effect.Effect<unknown, unknown, unknown> {
  return withBlock(subjectBlock(subject), block => {
    Reflect.apply(CoreStory.story, undefined, [
      subjectUpdate(subject, block),
      initialStep(block, initial, CoreStory.__givenInit),
      ...resolveInMessageSteps(
        resolveStorySteps(block, steps),
        subjectReceive(subject, block),
      ),
    ])
  })
}
