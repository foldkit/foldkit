import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { ApplicationBlock, Message, type Model } from './application'

const initialModel: Model = {
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
}

describe('update', () => {
  describe('content', () => {
    it.effect('UpdatedContent stores the encoded value', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(
          Message.UpdatedContent({
            value: 'WIFI:S:Network;T:WPA;P:secret;;',
          }),
        ),
        model(model => {
          expect(model.content).toBe('WIFI:S:Network;T:WPA;P:secret;;')
        }),
      ),
    )

    it.effect('clearing the input stores the empty string', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.UpdatedContent({ value: '' })),
        model(model => {
          expect(model.content).toBe('')
        }),
      ),
    )
  })

  describe('color changes', () => {
    it.effect('ChangedFillColor replaces only the fill', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ChangedFillColor({ value: '#0f766e' })),
        model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe(initialModel.backgroundColor)
          expect(model.content).toBe(initialModel.content)
        }),
      ),
    )

    it.effect('ChangedBackgroundColor replaces only the background', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ChangedBackgroundColor({ value: '#ffffff' })),
        model(model => {
          expect(model.backgroundColor).toBe('#ffffff')
          expect(model.fillColor).toBe(initialModel.fillColor)
        }),
      ),
    )

    it.effect('successive color changes accumulate', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ChangedFillColor({ value: '#9d174d' })),
        message(Message.ChangedBackgroundColor({ value: '#ffffff' })),
        message(Message.ChangedFillColor({ value: '#0f766e' })),
        model(model => {
          expect(model.fillColor).toBe('#0f766e')
          expect(model.backgroundColor).toBe('#ffffff')
        }),
      ),
    )

    it.effect('update never produces Commands', () =>
      story(
        ApplicationBlock,
        given(initialModel),
        message(Message.ChangedFillColor({ value: '#9d174d' })),
        Command.expectNone(),
      ),
    )
  })
})
