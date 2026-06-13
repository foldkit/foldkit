import { Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import {
  ChangedBackgroundColor,
  ChangedFillColor,
  type Model,
  UpdatedContent,
  update,
} from './main'

const initialModel: Model = {
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
}

describe('update', () => {
  describe('content', () => {
    test('UpdatedContent stores the encoded value', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(
          UpdatedContent({ value: 'WIFI:S:Network;T:WPA;P:secret;;' }),
        ),
        Story.model(model => {
          expect(model.content).toBe('WIFI:S:Network;T:WPA;P:secret;;')
        }),
      )
    })

    test('clearing the input stores the empty string', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(UpdatedContent({ value: '' })),
        Story.model(model => {
          expect(model.content).toBe('')
        }),
      )
    })
  })

  describe('color changes', () => {
    test('ChangedFillColor replaces only the fill', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedFillColor({ value: '#0f766e' })),
        Story.model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe(initialModel.backgroundColor)
          expect(model.content).toBe(initialModel.content)
        }),
      )
    })

    test('ChangedBackgroundColor replaces only the background', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedBackgroundColor({ value: '#ffffff' })),
        Story.model(model => {
          expect(model.backgroundColor).toBe('#ffffff')
          expect(model.fillColor).toBe(initialModel.fillColor)
        }),
      )
    })

    test('successive color changes accumulate', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedFillColor({ value: '#9d174d' })),
        Story.message(ChangedBackgroundColor({ value: '#ffffff' })),
        Story.message(ChangedFillColor({ value: '#0f766e' })),
        Story.model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe('#ffffff')
        }),
      )
    })

    test('update never produces Commands', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedFillColor({ value: '#9d174d' })),
        Story.Command.expectNone(),
      )
    })
  })
})
