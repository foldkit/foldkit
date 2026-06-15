import { Option } from 'effect'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import {
  SetChecked,
  Toggled,
  ToggledChecked,
  init,
  reflectChecked,
  setChecked,
  update,
} from './index.js'

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

    it('forces the checked state on SetChecked and emits ToggledChecked', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(SetChecked({ isChecked: true })),
        Story.model(model => {
          expect(model.isChecked).toBe(true)
        }),
        Story.expectOutMessage(ToggledChecked({ isChecked: true })),
      )
    })
  })

  describe('setChecked', () => {
    it('mirrors SetChecked and emits ToggledChecked with the new state', () => {
      const [nextModel, , maybeOutMessage] = setChecked(
        init({ id: 'test' }),
        true,
      )
      expect(nextModel.isChecked).toBe(true)
      expect(maybeOutMessage).toStrictEqual(
        Option.some(ToggledChecked({ isChecked: true })),
      )
    })
  })

  describe('reflectChecked', () => {
    it('reflects checked state onto the model without emitting', () => {
      expect(reflectChecked(init({ id: 'test' }), true).isChecked).toBe(true)
    })

    it('reflects unchecked state', () => {
      expect(
        reflectChecked(init({ id: 'test', isChecked: true }), false).isChecked,
      ).toBe(false)
    })
  })
})
