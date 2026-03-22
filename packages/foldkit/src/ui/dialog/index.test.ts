import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Test from '../../test'
import {
  CloseDialog,
  Closed,
  CompletedCloseDialog,
  CompletedShowDialog,
  Opened,
  ShowDialog,
  descriptionId,
  init,
  titleId,
  update,
} from './index'

describe('Dialog', () => {
  describe('init', () => {
    it('defaults isOpen to false', () => {
      expect(init({ id: 'test' })).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        transitionState: 'Idle',
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a custom isOpen', () => {
      expect(init({ id: 'test', isOpen: true })).toStrictEqual({
        id: 'test',
        isOpen: true,
        isAnimated: false,
        transitionState: 'Idle',
        maybeFocusSelector: Option.none(),
      })
    })

    it('accepts a focusSelector', () => {
      expect(
        init({ id: 'test', focusSelector: '#search-input' }),
      ).toStrictEqual({
        id: 'test',
        isOpen: false,
        isAnimated: false,
        transitionState: 'Idle',
        maybeFocusSelector: Option.some('#search-input'),
      })
    })
  })

  describe('update', () => {
    it('opens when closed on Opened', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test' })),
        Test.message(Opened()),
        Test.resolve(ShowDialog, CompletedShowDialog()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('opens without command when already open on Opened', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', isOpen: true })),
        Test.message(Opened()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('closes when open on Closed', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test', isOpen: true })),
        Test.message(Closed()),
        Test.resolve(CloseDialog, CompletedCloseDialog()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('closes without command when already closed on Closed', () => {
      Test.story(
        update,
        Test.with(init({ id: 'test' })),
        Test.message(Closed()),
        Test.tap(({ model }) => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('returns model unchanged on CompletedShowDialog', () => {
      const originalModel = init({ id: 'test' })
      Test.story(
        update,
        Test.with(originalModel),
        Test.message(CompletedShowDialog()),
        Test.tap(({ model }) => {
          expect(model).toBe(originalModel)
        }),
      )
    })
  })

  describe('titleId', () => {
    it('returns the id suffixed with -title', () => {
      const model = init({ id: 'my-dialog' })
      expect(titleId(model)).toBe('my-dialog-title')
    })
  })

  describe('descriptionId', () => {
    it('returns the id suffixed with -description', () => {
      const model = init({ id: 'my-dialog' })
      expect(descriptionId(model)).toBe('my-dialog-description')
    })
  })
})
