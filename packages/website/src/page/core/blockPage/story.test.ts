import { Effect } from 'effect'
import { type TestBlock, withBlock } from 'foldkit/story'
import { given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { BlockPageBlock, layer } from './block'
import { Message } from './message'

const makeFixture = (block: TestBlock<typeof BlockPageBlock>) => {
  const init = block.init
  const update = block.update

  return { block, init, update }
}

describe('Block page', () => {
  test('owns the mapMessages disclosure state', async () => {
    await Effect.runPromise(
      withBlock(BlockPageBlock, executable => {
        const { init, update } = makeFixture(executable)

        story(
          update,
          given(init().model),
          message(Message.ToggledMapMessagesUnderHood({ isOpen: true })),
          model(model => {
            expect(model.isMapMessagesUnderHoodOpen).toBe(true)
          }),
        )
      }).pipe(Effect.provide(layer)),
    )
  })
})
