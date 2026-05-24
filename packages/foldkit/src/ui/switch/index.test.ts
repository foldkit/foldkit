import { describe, expect, it } from 'vitest'

import * as Story from '../../test/story.js'
import { Toggled, ToggledChecked, init, update } from './index.js'

describe('Switch', () => {
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
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(Toggled()),
        Story.model(model => {
          expect(model.isChecked).toBe(true)
        }),
        Story.expectOutMessage(ToggledChecked({ isChecked: true })),
      )
    })

    it('toggles from checked to unchecked on Toggled', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', isChecked: true })),
        Story.message(Toggled()),
        Story.model(model => {
          expect(model.isChecked).toBe(false)
        }),
        Story.expectOutMessage(ToggledChecked({ isChecked: false })),
      )
    })
  })
})
