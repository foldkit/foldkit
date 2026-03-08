import { expect, test } from 'vitest'

test('delayed reset: count stays, then resets when the delay fires', () => {
  // User clicks reset — update describes a delay, doesn't start one
  const [afterClick, commands] = update(
    Model({ count: 5 }),
    ClickedResetAfterDelay(),
  )
  expect(afterClick.count).toBe(5)
  expect(commands).toHaveLength(1)

  // The runtime executes the delay and sends ElapsedResetDelay
  const [afterDelay] = update(afterClick, ElapsedResetDelay())
  expect(afterDelay.count).toBe(0)
})
