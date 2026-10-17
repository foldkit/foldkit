import { expectOutMessage, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, OutMessage } from './definition'
import { init } from './init'
import { update } from './update'

describe('education entry', () => {
  test('UpdatedSchool stores a valid school', () => {
    story(
      update,
      given(init('entry-1')),
      message(Message.UpdatedSchool({ value: 'MIT' })),
      model(model => {
        expect(model.school.value).toBe('MIT')
        expect(model.school._tag).toBe('Valid')
      }),
    )
  })

  test('clearing school after a value makes the field Invalid', () => {
    story(
      update,
      given(init('entry-1')),
      message(Message.UpdatedSchool({ value: 'MIT' })),
      message(Message.UpdatedSchool({ value: '' })),
      model(model => {
        expect(model.school._tag).toBe('Invalid')
      }),
    )
  })

  test('ClickedRemoveSelf emits Removed', () => {
    story(
      update,
      given(init('entry-1')),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    )
  })
})
