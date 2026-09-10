import { Calendar } from 'foldkit'
import { expectOutMessage, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, OutMessage, init, update } from './entry'

const today = Calendar.make(2026, 4, 16)

describe('workHistory entry', () => {
  test('UpdatedCompany stores a valid company', () => {
    story(
      update,
      given(init('entry-1', today)),
      message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      model(model => {
        expect(model.company.value).toBe('Foldkit Inc.')
        expect(model.company._tag).toBe('Valid')
      }),
    )
  })

  test('clearing company after a value makes the field Invalid', () => {
    story(
      update,
      given(init('entry-1', today)),
      message(Message.UpdatedCompany({ value: 'Foldkit Inc.' })),
      message(Message.UpdatedCompany({ value: '' })),
      model(model => {
        expect(model.company._tag).toBe('Invalid')
      }),
    )
  })

  test('ClickedRemoveSelf emits Removed', () => {
    story(
      update,
      given(init('entry-1', today)),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    )
  })
})
