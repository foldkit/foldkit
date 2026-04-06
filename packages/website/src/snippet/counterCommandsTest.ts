import { Story } from 'foldkit'
import { expect, test } from 'vitest'

test('delayed reset: count resets after the delay fires', () => {
  Story.story(
    update,
    Story.with({ count: 5 }),
    Story.message(ClickedResetAfterDelay()),
    Story.expectHasCommand(DelayReset),
    Story.resolve(DelayReset, DelayedReset()),
    Story.model(model => {
      expect(model.count).toBe(0)
    }),
  )
})
