import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import * as Story from '../../test/story'
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
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(Opened()),
        Story.resolve(ShowDialog, CompletedShowDialog()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('opens without command when already open on Opened', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', isOpen: true })),
        Story.message(Opened()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
      )
    })

    it('closes when open on Closed', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test', isOpen: true })),
        Story.message(Closed()),
        Story.resolve(CloseDialog, CompletedCloseDialog()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('closes without command when already closed on Closed', () => {
      Story.story(
        update,
        Story.with(init({ id: 'test' })),
        Story.message(Closed()),
        Story.model(model => {
          expect(model.isOpen).toBe(false)
        }),
      )
    })

    it('returns model unchanged on CompletedShowDialog', () => {
      const originalModel = init({ id: 'test' })
      Story.story(
        update,
        Story.with(originalModel),
        Story.message(CompletedShowDialog()),
        Story.model(model => {
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
