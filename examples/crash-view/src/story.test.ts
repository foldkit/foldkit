import { describe, expect, test } from 'vitest'

import { Message, update } from './main'

describe('update', () => {
  test('handling any Message throws to trigger the crash view', () => {
    expect(() => update(null, Message.ClickedCrash())).toThrow(
      'This is a simulated crash!',
    )
  })
})
