import { init } from 'foldkit/story'
import { expectOutMessage, message, model, story } from 'foldkit/story'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'

import { EducationEntryBlock, layer } from './block'
import { Message, OutMessage } from './definition'

describe('education entry', () => {
  it.effect('UpdatedSchool stores a valid school', () =>
    story(
      { block: EducationEntryBlock, layer },
      init('entry-1'),
      message(Message.UpdatedSchool({ value: 'MIT' })),
      model(model => {
        expect(model.school.value).toBe('MIT')
        expect(model.school._tag).toBe('Valid')
      }),
    ),
  )

  it.effect('clearing school after a value makes the field Invalid', () =>
    story(
      { block: EducationEntryBlock, layer },
      init('entry-1'),
      message(Message.UpdatedSchool({ value: 'MIT' })),
      message(Message.UpdatedSchool({ value: '' })),
      model(model => {
        expect(model.school._tag).toBe('Invalid')
      }),
    ),
  )

  it.effect('ClickedRemoveSelf emits Removed', () =>
    story(
      { block: EducationEntryBlock, layer },
      init('entry-1'),
      message(Message.ClickedRemoveSelf()),
      expectOutMessage(OutMessage.Removed()),
    ),
  )
})
