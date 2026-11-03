import { Predicate } from 'effect'

import * as ScopedStory from '../experimental/layered/testing/story.js'
import * as CoreStory from '../test/story.js'

/**
 * Runs ordinary Story steps synchronously when given an update function.
 * A Block descriptor or `{ block, updateContext? }` config returns a deferred
 * Effect that acquires and scopes the Block graph before running the steps.
 * Block-aware Stories start with `init(...)` or `given(model)`.
 */
export const story: typeof ScopedStory.story & typeof CoreStory.story = (
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
