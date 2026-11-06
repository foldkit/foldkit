import { Story } from 'foldkit'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, type Model, layer } from './block'

const initialModel: Model = {
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
}

describe('update', () => {
  describe('content', () => {
    it.effect('UpdatedContent stores the encoded value', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(
          Message.UpdatedContent({
            value: 'WIFI:S:Network;T:WPA;P:secret;;',
          }),
        ),
        Story.model(model => {
          expect(model.content).toBe('WIFI:S:Network;T:WPA;P:secret;;')
        }),
      ),
    )

    it.effect('clearing the input stores the empty string', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.UpdatedContent({ value: '' })),
        Story.model(model => {
          expect(model.content).toBe('')
        }),
      ),
    )
  })

  describe('color changes', () => {
    it.effect('ChangedFillColor replaces only the fill', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedFillColor({ value: '#0f766e' })),
        Story.model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe(initialModel.backgroundColor)
          expect(model.content).toBe(initialModel.content)
        }),
      ),
    )

    it.effect('ChangedBackgroundColor replaces only the background', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedBackgroundColor({ value: '#ffffff' })),
        Story.model(model => {
          expect(model.backgroundColor).toBe('#ffffff')
          expect(model.fillColor).toBe(initialModel.fillColor)
        }),
      ),
    )

    it.effect('successive color changes accumulate', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedFillColor({ value: '#9d174d' })),
        Story.message(Message.ChangedBackgroundColor({ value: '#ffffff' })),
        Story.message(Message.ChangedFillColor({ value: '#0f766e' })),
        Story.model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe('#ffffff')
        }),
      ),
    )

    it.effect('update never produces Commands', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.given(initialModel),
        Story.message(Message.ChangedFillColor({ value: '#9d174d' })),
        Story.Command.expectNone(),
      ),
    )
  })
})
