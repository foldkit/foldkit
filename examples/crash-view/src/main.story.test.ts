import { describe, expect, test } from 'vitest'

import { ClickedCrash, update } from './main'

describe('update', () => {
  test('handling any Message throws to trigger the crash view', () => {
    expect(() => update(null, ClickedCrash())).toThrow(
      'This is a simulated crash!',
    )
  })
})
