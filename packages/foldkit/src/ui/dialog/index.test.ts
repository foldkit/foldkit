import { describe, it } from '@effect/vitest'
import { Option } from 'effect'
import { expect } from 'vitest'

import {
  Closed,
  CompletedDialogShow,
  Opened,
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
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Opened())
      expect(result.isOpen).toBe(true)
      expect(commands).toHaveLength(1)
    })

    it('opens without command when already open on Opened', () => {
      const model = init({ id: 'test', isOpen: true })
      const [result, commands] = update(model, Opened())
      expect(result.isOpen).toBe(true)
      expect(commands).toHaveLength(0)
    })

    it('closes when open on Closed', () => {
      const model = init({ id: 'test', isOpen: true })
      const [result, commands] = update(model, Closed())
      expect(result.isOpen).toBe(false)
      expect(commands).toHaveLength(1)
    })

    it('closes without command when already closed on Closed', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, Closed())
      expect(result.isOpen).toBe(false)
      expect(commands).toHaveLength(0)
    })

    it('returns model unchanged on CompletedDialogShow', () => {
      const model = init({ id: 'test' })
      const [result, commands] = update(model, CompletedDialogShow())
      expect(result).toBe(model)
      expect(commands).toHaveLength(0)
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
