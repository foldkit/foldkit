import { Story } from 'foldkit'
import { expect, test } from 'vitest'

test('delayed reset: count resets after the delay fires', () => {
  Story.story(
    update,
    Story.with({ count: 5 }),
    Story.message(ClickedResetAfterDelay()),
    Story.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(DelayReset.name)
    }),
    Story.resolve(DelayReset, DelayedReset()),
    Story.tap(({ model }) => {
      expect(model.count).toBe(0)
    }),
  )
})
