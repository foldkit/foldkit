import { describe, expect, it } from 'vitest'

import * as Test from '../../test'
import { Toggled, init, update } from './index'

describe('Checkbox', () => {
  describe('init', () => {
    it('defaults isChecked to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isChecked: false,
      })
    })

    it('accepts isChecked override', () => {
      expect(init({ id: 'test', isChecked: true })).toStrictEqual({
        id: 'test',
        isChecked: true,
      })
    })
  })

  describe('update', () => {
    it('toggles from unchecked to checked on Toggled', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test' })),
        Test.message(Toggled()),
        Test.tap(({ model }) => {
          expect(model.isChecked).toBe(true)
        }),
      )
    })

    it('toggles from checked to unchecked on Toggled', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', isChecked: true })),
        Test.message(Toggled()),
        Test.tap(({ model }) => {
          expect(model.isChecked).toBe(false)
        }),
      )
    })
  })
})
