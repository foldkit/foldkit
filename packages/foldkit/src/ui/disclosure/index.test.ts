import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Test from '../../test'
import {
  Closed,
  CompletedFocusButton,
  FocusButton,
  Toggled,
  init,
  update,
} from './index'

describe('Disclosure', () => {
  describe('init', () => {
    it('defaults isOpen to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
      })
    })

    it('accepts a custom isOpen', () => {
      expect(init({ id: 'test', isOpen: true })).toStrictEqual({
        id: 'test',
        isOpen: true,
      })
    })
  })

  describe('update', () => {
    it('opens when closed on Toggled', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test' })),
        Test.message(Toggled()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('closes when open on Toggled', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', isOpen: true })),
        Test.message(Toggled()),
        Test.resolve(FocusButton, CompletedFocusButton()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('closes when open on Closed', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', isOpen: true })),
        Test.message(Closed()),
        Test.resolve(FocusButton, CompletedFocusButton()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('is a no-op when already closed on Closed', () => {
      const originalModel = init({ id: 'test' })
      Test.story(
        update,
        Test.with(originalModel),
        Test.message(Closed()),
        Test.tap(({ model }) => {
          expect(model).toStrictEqual(originalModel)
        }),
      )
    })

    it('returns model unchanged on CompletedFocusButton', () => {
      const originalModel = init({ id: 'test' })
      Test.story(
        update,
        Test.with(originalModel),
        Test.message(CompletedFocusButton()),
        Test.tap(({ model }) => {
          expect(model).toBe(originalModel)
        }),
      )
    })
  })
})
