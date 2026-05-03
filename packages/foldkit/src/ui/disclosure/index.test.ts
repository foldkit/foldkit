import { describe, it } from '@effect/vitest'
import { expect } from 'vitest'

import * as Story from '../../test/story.js'
import {
  Closed,
  CompletedFocusButton,
  FocusButton,
  Toggled,
  init,
  update,
} from './index.js'

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
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(Toggled()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('closes when open on Toggled', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', isOpen: true })),
        Story.message(Toggled()),
        Story.Command.resolve(FocusButton, CompletedFocusButton()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('closes when open on Closed', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', isOpen: true })),
        Story.message(Closed()),
        Story.Command.resolve(FocusButton, CompletedFocusButton()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('is a no-op when already closed on Closed', () => {
      const originalModel = init({ id: 'test' })
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(Closed()),
        Story.model(model => {
          expect(model).toStrictEqual(originalModel)
        }),
      )
    })

    it('returns model unchanged on CompletedFocusButton', () => {
      const originalModel = init({ id: 'test' })
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(CompletedFocusButton()),
        Story.model(model => {
          expect(model).toBe(originalModel)
        }),
      )
    })
  })
})
