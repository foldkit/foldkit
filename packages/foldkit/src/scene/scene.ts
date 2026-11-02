import { Predicate } from 'effect'

import * as ScopedScene from '../experimental/layered/testing/scene.js'
import * as CoreScene from '../test/scene.js'

/**
 * Runs ordinary Scene steps synchronously for an `{ update, view }` config.
 * A Block descriptor or `{ block, ... }` config returns a deferred Effect
 * that acquires and scopes the Block graph before rendering its default view.
 * Block-aware Scenes start with `init(...)` or `given(model)`.
 * Choose either `block` or `update` and `view` in a config.
 */
export const scene: typeof ScopedScene.scene & typeof CoreScene.scene = (
  subject: unknown,
  ...steps: ReadonlyArray<unknown>
) => {
  if (!Predicate.isObject(subject)) {
    throw new TypeError(
      '[foldkit] scene requires a Block descriptor, a { block } config, or an { update, view } config.',
    )
  }

  if ('block' in subject && ('update' in subject || 'view' in subject)) {
    throw new TypeError(
      '[foldkit] A Scene config selects either block or update and view.',
    )
  }

  return Reflect.apply(
    !('block' in subject) && 'update' in subject && 'view' in subject
      ? CoreScene.scene
      : ScopedScene.scene,
    undefined,
    [subject, ...steps],
  )
}
