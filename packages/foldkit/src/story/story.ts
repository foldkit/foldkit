import { type Layer, Predicate } from 'effect'

import * as ScopedStory from '../experimental/layered/testing/story.js'
import type {
  DirectSubject,
  SelectedTestConfig,
  TestConfig,
  TestInMessage,
  TestInit,
  TestMessage,
  TestModel,
  TestOutMessage,
} from '../experimental/layered/testing/subject.js'
import type {
  BlockSubject,
  TestEffect,
} from '../experimental/layered/testing/withBlock.js'
import type {
  DeclaredRootBlock,
  SelectedLayeredRoot,
} from '../runtime/rootBlock.js'
import * as CoreStory from '../test/story.js'

type StoryBlock<Subject> =
  Subject extends Readonly<{
    block: infer Block extends DeclaredRootBlock
    layer: infer LayerValue extends Layer.Layer<any, any, any>
  }>
    ? SelectedLayeredRoot<Block, LayerValue>
    : Subject extends Readonly<{ block: infer Block extends BlockSubject }>
      ? Block
      : Subject extends BlockSubject
        ? Subject
        : never

type StoryUpdate = (...args: ReadonlyArray<never>) => unknown
type StoryOutMessage<Output> =
  Output extends Readonly<{ outMessage?: infer OutMessage }>
    ? OutMessage
    : undefined

type StorySteps<Subject> = Subject extends StoryUpdate
  ? ReadonlyArray<
      CoreStory.StoryStep<
        Parameters<Subject>[0],
        Parameters<Subject>[1],
        StoryOutMessage<ReturnType<Subject>>
      >
    >
  : readonly [
      initial:
        | TestInit<StoryBlock<Subject>>
        | CoreStory.GivenStep<TestModel<StoryBlock<Subject>>>,
      ...steps: ReadonlyArray<
        CoreStory.StoryStep<
          TestModel<StoryBlock<Subject>>,
          TestMessage<StoryBlock<Subject>>,
          TestOutMessage<StoryBlock<Subject>>,
          TestInMessage<StoryBlock<Subject>>
        >
      >,
    ]

type StorySubjectValidation<Subject> = Subject extends StoryUpdate
  ? Subject extends (
      model: Parameters<Subject>[0],
      message: Parameters<Subject>[1],
    ) => Readonly<{
      model: Parameters<Subject>[0]
      commands?: ReadonlyArray<CoreStory.AnyCommand> | undefined
    }>
    ? unknown
    : never
  : Subject extends Readonly<{
        block: infer Block extends DeclaredRootBlock
        layer: infer LayerValue extends Layer.Layer<any, any, any>
      }>
    ? SelectedTestConfig<Block, LayerValue>
    : Subject extends Readonly<{ block: infer Block extends BlockSubject }>
      ? TestConfig<Block>
      : Subject extends BlockSubject
        ? DirectSubject<Subject>
        : never

interface ContextualStory {
  <const Subject>(
    subject: Subject & StorySubjectValidation<NoInfer<Subject>>,
    ...steps: StorySteps<NoInfer<Subject>>
  ): Subject extends (...args: ReadonlyArray<never>) => unknown
    ? Parameters<Subject>[0]
    : TestEffect<StoryBlock<Subject>, TestModel<StoryBlock<Subject>>>
}

/**
 * Runs ordinary Story steps synchronously when given an update function.
 * A Block descriptor or `{ block, updateContext? }` config returns a deferred
 * Effect that acquires and scopes the Block graph before running the steps.
 * Block-aware Stories start with `init(...)` or `given(model)`.
 */
export const story: ContextualStory &
  typeof ScopedStory.story &
  typeof CoreStory.story = (
  subject: unknown,
  ...steps: ReadonlyArray<unknown>
) => {
  if (!Predicate.isFunction(subject) && !Predicate.isObject(subject)) {
    throw new TypeError(
      '[foldkit] story requires an update function, a Block descriptor, or a { block } config.',
    )
  }

  return Reflect.apply(
    Predicate.isFunction(subject) ? CoreStory.story : ScopedStory.story,
    undefined,
    [subject, ...steps],
  )
}
