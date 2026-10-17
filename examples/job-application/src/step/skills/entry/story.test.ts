import { expectOutMessage, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Message, OutMessage } from './definition'
import { init } from './init'
import { update } from './update'

describe('skills entry', () => {
  test('UpdatedName stores a valid skill name', () => {
    story(
      update,
      given(init('entry-1')),
      message(Message.UpdatedName({ value: 'TypeScript' })),
      model(model => {
        expect(model.name.value).toBe('TypeScript')
        expect(model.name._tag).toBe('Valid')
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
