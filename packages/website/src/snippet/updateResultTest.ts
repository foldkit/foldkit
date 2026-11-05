import { Command, given, message, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { SubmitForm } from './command'
import { FormBlock, layer } from './index'
import { Message } from './message'
import { readyForm } from './model.fixture'

export const formSubmission = story(
  { block: FormBlock, layer },
  given(readyForm),
  message(Message.SubmittedForm()),
  model(model => {
    expect(model.status).toBe('Submitting')
  }),
  Command.expectExact(SubmitForm),
  Command.resolve(SubmitForm, Message.CompletedSubmitForm()),
)
