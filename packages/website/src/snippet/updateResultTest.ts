import { Story } from 'foldkit'
import { expect } from 'vitest'

import { SubmitForm } from './command'
import { FormBlock, layer } from './index'
import { Message } from './message'
import { readyForm } from './model.fixture'

export const formSubmission = Story.story(
  { block: FormBlock, layer },
  Story.given(readyForm),
  Story.message(Message.SubmittedForm()),
  Story.model(model => {
    expect(model.status).toBe('Submitting')
  }),
  Story.Command.expectExact(SubmitForm),
  Story.Command.resolve(SubmitForm, Message.CompletedSubmitForm()),
)
