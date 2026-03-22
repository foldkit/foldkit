import { Test } from 'foldkit'
import { expect, test } from 'vitest'

test('delayed reset: count resets after the delay fires', () => {
  Test.story(
    update,
    Test.with({ count: 5 }),
    Test.message(ClickedResetAfterDelay()),
    Test.tap(({ commands }) => {
      expect(commands[0]?.name).toBe(DelayReset.name)
    }),
    Test.resolve(DelayReset, DelayedReset()),
    Test.tap(({ model }) => {
      expect(model.count).toBe(0)
    }),
  )
})
