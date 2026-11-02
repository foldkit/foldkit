import { Effect } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { ApplicationBlock, Message, type Model } from './application'

const initialModel: Model = {
  content: 'https://foldkit.dev',
  fillColor: '#1e1b4b',
  backgroundColor: '#fef3c7',
}

describe('update', () => {
  describe('content', () => {
    test('UpdatedContent stores the encoded value', async () => {
      await Effect.runPromise(
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
    })

    test('clearing the input stores the empty string', async () => {
      await Effect.runPromise(
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
  })

  describe('color changes', () => {
    test('ChangedFillColor replaces only the fill', async () => {
      await Effect.runPromise(
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
    })

    test('ChangedBackgroundColor replaces only the background', async () => {
      await Effect.runPromise(
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
    })

    test('successive color changes accumulate', async () => {
      await Effect.runPromise(
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
    })

    test('update never produces Commands', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ChangedFillColor({ value: '#9d174d' })),
          Command.expectNone(),
        ),
      )
    })
  })
})
