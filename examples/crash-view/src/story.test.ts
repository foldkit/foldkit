import { Effect } from 'effect'
import { withBlock } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock, Message } from './application'

describe('update', () => {
  test('handling any Message throws to trigger the crash view', async () => {
    await Effect.runPromise(
      withBlock(ApplicationBlock, block => {
        expect(() => block.update(null, Message.ClickedCrash())).toThrow(
          'This is a simulated crash!',
        )
      }),
    )
  })
})
