import { expect, test } from 'vitest'

test('delayed reset: count stays, then resets when the delay fires', () => {
  // User clicks reset — update describes a delay, doesn't start one
  const [afterClick, commands] = update(
    Model({ count: 5 }),
    ClickedResetAfterDelay(),
  )
  expect(afterClick.count).toBe(5)
  expect(commands).toHaveLength(1)
  expect(commands[0].name).toBe(DelayReset.name)

  const [afterDelay] = update(afterClick, DelayedReset())
  expect(afterDelay.count).toBe(0)
})
