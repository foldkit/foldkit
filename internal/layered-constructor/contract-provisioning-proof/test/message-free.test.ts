import { Effect, Layer } from 'effect'
import { Scene, Story } from 'foldkit/experimental/layered/testing'
import { expect, test } from 'vitest'

import { routedBody, SilentBlock, SilentParentBlock } from '../src/message-free'

test('message-free leaves and parents initialize through ordinary scoped tests', () =>
  Effect.runPromise(
    Effect.all([
      Story.story(
        SilentBlock,
        Story.init('Silent leaf'),
        Story.model(model => expect(model.label).toBe('Silent leaf')),
      ),
      Scene.scene(
        SilentParentBlock,
        Scene.init(),
        Scene.expect(Scene.text('Silent child')).toExist(),
      ),
    ]),
  ))

test('erased callers cannot declare routed child delivery as message-free', async () => {
  const { definition, constructor, childLayer } = routedBody()
  const block = Reflect.apply(definition.makeBlock, undefined, [constructor])

  await expect(
    Effect.runPromise(
      block.get.pipe(
        Effect.provide(block.layer.pipe(Layer.provide(childLayer))),
      ),
    ),
  ).rejects.toThrow('completed dispatch Schema must match')
})
