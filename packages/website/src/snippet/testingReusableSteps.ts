import { given, message, model, steps, story } from 'foldkit/story'
import { expect, test } from 'vitest'

const givenIncremented = steps(given({ count: 0 }), message(ClickedIncrement()))

test('increments again', () => {
  story(
    update,
    givenIncremented,
    message(ClickedIncrement()),
    model(model => {
      expect(model.count).toBe(2)
    }),
  )
})

test('decrements from the shared setup', () => {
  story(
    update,
    givenIncremented,
    message(ClickedDecrement()),
    model(model => {
      expect(model.count).toBe(0)
    }),
  )
})
