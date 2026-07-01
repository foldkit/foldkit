import { html } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import type { Message, Model, ViewInputs } from './index.js'
import {
  Closed,
  CompletedFocusButton,
  FocusButton,
  Toggled,
  buttonId,
  init,
  reflectOpenState,
  update,
  view,
} from './index.js'

const sceneView =
  (overrides: Omit<Partial<ViewInputs>, 'toView'> = {}) =>
  (model: Model) => {
    const h = html<Message>()

    return view(model, {
      ...overrides,
      toView: ({ button, panel }) =>
        h.div(
          [],
          [
            h.keyed('button')('test-button', [...button], []),
            h.keyed('div')('test-panel', [...panel], []),
          ],
        ),
    })
  }

const button = Scene.selector('[key="test-button"]')

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

  describe('reflectOpenState', () => {
    it('reflects open state onto the model without emitting', () => {
      expect(reflectOpenState(init({ id: 'test' }), true).isOpen).toBe(true)
    })

    it('reflects closed state without running the focus command', () => {
      expect(
        reflectOpenState(init({ id: 'test', isOpen: true }), false).isOpen,
      ).toBe(false)
    })
  })

  describe('button labeling', () => {
    it('no aria-label or aria-labelledby on the button by default', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(init({ id: 'test' })),
        Scene.expect(button).not.toHaveAttr('aria-label'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-label to the button when ariaLabel is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabel: 'Details' }) },
        Scene.with(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-label', 'Details'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('applies aria-labelledby to the button when ariaLabelledBy is provided', () => {
      Scene.scene(
        { update, view: sceneView({ ariaLabelledBy: 'details-label' }) },
        Scene.with(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-labelledby', 'details-label'),
        Scene.expect(button).not.toHaveAttr('aria-label'),
      )
    })

    it('prefers aria-label over aria-labelledby when both are provided', () => {
      Scene.scene(
        {
          update,
          view: sceneView({
            ariaLabel: 'Details',
            ariaLabelledBy: 'details-label',
          }),
        },
        Scene.with(init({ id: 'test' })),
        Scene.expect(button).toHaveAttr('aria-label', 'Details'),
        Scene.expect(button).not.toHaveAttr('aria-labelledby'),
      )
    })

    it('buttonId derives the trigger id from the base id', () => {
      expect(buttonId('test')).toBe('test-button')
    })
  })
})
